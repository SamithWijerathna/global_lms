import { NextResponse } from "next/server";
import { getDBConnection, authorize } from "../db";

export async function GET(req: Request) {
  try {
    const db = await getDBConnection();
    const authError = await authorize(req, db);
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status });
    }
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const classId = searchParams.get("classId");

    // Build date filter for payments
    let dateFilter = "";
    let paymentParams: any[] = [];

    if (startDate && endDate) {
      dateFilter = "AND DATE(p.created_at) BETWEEN ? AND ?";
      paymentParams = [startDate, endDate];
    }

    // Build class filter
    let classFilter = "";
    
    if (classId && classId !== "all") {
      classFilter = "AND p.item_id = ?";
      paymentParams.push(classId);
    }

    // 1. Total Students
    const [totalStudentsResult] = await db.query(
      "SELECT COUNT(DISTINCT uuid) as total FROM users"
    ) as any;
    const totalStudents = totalStudentsResult[0]?.total || 0;

    // 2. Active Students (students with payments or marks)
    let activeStudentsQuery = `SELECT COUNT(DISTINCT student_uuid) as active FROM (
        SELECT DISTINCT student_uuid FROM payments WHERE status = 'approved'`;
    let activeStudentsParams: any[] = [];
    
    if (classId && classId !== "all") {
      activeStudentsQuery += ` AND item_id = ? AND item_type = 'class'`;
      activeStudentsParams.push(classId);
    }
    
    activeStudentsQuery += `
        UNION
        SELECT DISTINCT student_uuid FROM students_marks
      ) as active_students`;
    
    const [activeStudentsResult] = await db.query(activeStudentsQuery, activeStudentsParams) as any;
    const activeStudents = activeStudentsResult[0]?.active || 0;

    // 3. Total Revenue (approved payments only)
    const revenueParams: any[] = [];
    let revenueFilter = "WHERE status = 'approved'";
    if (startDate && endDate) {
      revenueFilter += " AND DATE(created_at) BETWEEN ? AND ?";
      revenueParams.push(startDate, endDate);
    }
    if (classId && classId !== "all") {
      revenueFilter += " AND item_id = ? AND item_type = 'class'";
      revenueParams.push(classId);
    }
    const [revenueResult] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments ${revenueFilter}`,
      revenueParams
    ) as any;
    const totalRevenue = revenueResult[0]?.total || 0;

    // 4. Average Marks
    const [avgMarksResult] = await db.query(
      `SELECT COALESCE(AVG(mark_a + mark_b), 0) as avgMarks FROM students_marks`
    ) as any;
    const avgMarks = avgMarksResult[0]?.avgMarks || 0;

    // 5. Total Classes (filtered by date range if selected)
    let totalClassesQuery = "SELECT COUNT(*) as total FROM class_list c WHERE 1=1";
    let classCountParams: any[] = [];
    
    if (classId && classId !== "all") {
      totalClassesQuery += " AND c.class_id = ?";
      classCountParams.push(classId);
    }
    
    if (startDate && endDate) {
      totalClassesQuery += ` AND (
        (c.renew_type = '30days' AND DATE_ADD(c.create_at, INTERVAL 30 DAY) >= ? AND c.create_at <= ?)
        OR (c.renew_type = '90days' AND DATE_ADD(c.create_at, INTERVAL 90 DAY) >= ? AND c.create_at <= ?)
        OR (c.renew_type NOT IN ('30days', '90days') AND c.create_at <= ?)
      )`;
      classCountParams = [startDate, endDate, startDate, endDate, endDate];
    }
    
    const [totalClassesResult] = await db.query(totalClassesQuery, classCountParams) as any;
    const totalClasses = totalClassesResult[0]?.total || 0;

    // 6. Payment Status Distribution
    let paymentStatusQuery = "SELECT status, COUNT(*) as count FROM payments WHERE 1=1";
    let paymentStatusParams: any[] = [];
    
    if (startDate && endDate) {
      paymentStatusQuery += " AND DATE(created_at) BETWEEN ? AND ?";
      paymentStatusParams.push(startDate, endDate);
    }
    if (classId && classId !== "all") {
      paymentStatusQuery += " AND item_id = ? AND item_type = 'class'";
      paymentStatusParams.push(classId);
    }
    
    paymentStatusQuery += " GROUP BY status";
    
    const [paymentStatusResult] = await db.query(paymentStatusQuery, paymentStatusParams) as any;
    const paymentStatus = paymentStatusResult as any[];

    // 7. Revenue Per Class (filtered by active classes in date range)
    let revenuePerClassQuery = `
      SELECT 
        c.class_title,
        c.class_id,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(DISTINCT p.student_uuid) as students
      FROM class_list c
      LEFT JOIN payments p ON p.item_id = c.class_id AND p.item_type = 'class' AND p.status = 'approved' ${dateFilter}
      WHERE 1=1`;
    
    if (classId && classId !== "all") {
      revenuePerClassQuery += " AND c.class_id = ?";
    }
    
    let revenuePerClassParams: any[] = [...paymentParams];
    
    if (classId && classId !== "all") {
      revenuePerClassParams.push(classId);
    }
    
    if (startDate && endDate) {
      revenuePerClassQuery += ` AND (
        (c.renew_type = '30days' AND DATE_ADD(c.create_at, INTERVAL 30 DAY) >= ? AND c.create_at <= ?)
        OR (c.renew_type = '90days' AND DATE_ADD(c.create_at, INTERVAL 90 DAY) >= ? AND c.create_at <= ?)
        OR (c.renew_type NOT IN ('30days', '90days') AND c.create_at <= ?)
      )`;
      revenuePerClassParams.push(startDate, endDate, startDate, endDate, endDate);
    }
    
    revenuePerClassQuery += ` GROUP BY c.class_id, c.class_title ORDER BY revenue DESC`;
    
    const [revenuePerClassResult] = await db.query(revenuePerClassQuery, revenuePerClassParams) as any;
    const revenuePerClass = revenuePerClassResult as any[];

    // 8. Students Per Class (filtered by active classes in date range)
    let studentsPerClassQuery = `
      SELECT 
        c.class_title,
        c.class_id,
        COUNT(DISTINCT p.student_uuid) as student_count
      FROM class_list c
      LEFT JOIN payments p ON p.item_id = c.class_id AND p.item_type = 'class' AND p.status = 'approved'
      WHERE 1=1`;
    
    if (classId && classId !== "all") {
      studentsPerClassQuery += " AND c.class_id = ?";
    }
    
    let studentsParams: any[] = [];
    
    if (classId && classId !== "all") {
      studentsParams.push(classId);
    }
    
    if (startDate && endDate) {
      studentsPerClassQuery += ` AND (
        (c.renew_type = '30days' AND DATE_ADD(c.create_at, INTERVAL 30 DAY) >= ? AND c.create_at <= ?)
        OR (c.renew_type = '90days' AND DATE_ADD(c.create_at, INTERVAL 90 DAY) >= ? AND c.create_at <= ?)
        OR (c.renew_type NOT IN ('30days', '90days') AND c.create_at <= ?)
      )`;
      studentsParams.push(startDate, endDate, startDate, endDate, endDate);
    }
    
    studentsPerClassQuery += ` GROUP BY c.class_id, c.class_title ORDER BY student_count DESC`;
    
    const [studentsPerClassResult] = await db.query(studentsPerClassQuery, studentsParams) as any;
    const studentsPerClass = studentsPerClassResult as any[];

    // 9. Payments Over Time (Last 30 days)
    const [paymentsOverTimeResult] = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM payments
      WHERE status = 'approved'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC`
    ) as any;
    const paymentsOverTime = paymentsOverTimeResult as any[];

    // 10. Top Students by Average Marks
    const [topStudentsResult] = await db.query(
      `SELECT 
        u.uuid as student_uuid,
        u.student_id,
        CONCAT(u.first_name, ' ', u.last_name) as full_name,
        u.batch,
        AVG(sm.mark_a + sm.mark_b) as avg_marks,
        COUNT(sm.id) as exam_count,
        SUM(sm.mark_a + sm.mark_b) as total_marks
      FROM users u
      INNER JOIN students_marks sm ON u.uuid = sm.student_uuid
      GROUP BY u.uuid, u.student_id, u.first_name, u.last_name, u.batch
      ORDER BY avg_marks DESC
      LIMIT 10`
    );
    const topStudents = topStudentsResult as any[];

    // 11. Recent Payments
    const [recentPaymentsResult] = await db.query(
      `SELECT 
        p.payment_uuid,
        p.student_uuid,
        p.amount,
        p.status,
        p.created_at,
        p.item_type,
        u.student_id,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        c.class_title,
        sp.studypack_title
      FROM payments p
      LEFT JOIN users u ON p.student_uuid = u.uuid
      LEFT JOIN class_list c ON p.item_id = c.class_id AND p.item_type = 'class'
      LEFT JOIN studypack_list sp ON p.item_id = sp.studypack_id AND p.item_type = 'studypack'
      WHERE p.status = 'approved' ${dateFilter}
      ORDER BY p.created_at DESC
      LIMIT 10`,
      paymentParams
    ) as any;
    const recentPayments = recentPaymentsResult as any[];

    // 12. Marks Distribution
    const [marksDistributionResult] = await db.query(
      `SELECT 
        CASE 
          WHEN (mark_a + mark_b) < 50 THEN '0-50'
          WHEN (mark_a + mark_b) >= 50 AND (mark_a + mark_b) < 70 THEN '50-70'
          WHEN (mark_a + mark_b) >= 70 THEN '70-100'
        END as \`range\`,
        COUNT(*) as count
      FROM students_marks
      GROUP BY \`range\``
    ) as any;
    const marksDistribution = marksDistributionResult as any[];

    // 13. Paper Analytics
    const [paperAnalyticsResult] = await db.query(
      `SELECT 
        pp.paper_id,
        pp.paper_name,
        COUNT(sm.id) as submissions,
        AVG(sm.mark_a + sm.mark_b) as avg_marks,
        MAX(sm.mark_a + sm.mark_b) as highest_marks,
        MIN(sm.mark_a + sm.mark_b) as lowest_marks
      FROM paper_predefine pp
      LEFT JOIN students_marks sm ON pp.paper_id = sm.paper_id
      GROUP BY pp.paper_id, pp.paper_name
      ORDER BY avg_marks DESC`
    );
    const paperAnalytics = paperAnalyticsResult as any[];

    // 14. New Students Per Month (Last 12 months)
    const [newStudentsPerMonthResult] = await db.query(
      `SELECT 
        DATE_FORMAT(create_at, '%Y-%m') as month,
        COUNT(*) as count
      FROM users
      WHERE create_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(create_at, '%Y-%m')
      ORDER BY month ASC`
    );
    const newStudentsPerMonth = newStudentsPerMonthResult as any[];

    // 15. All Classes for Filter (filtered by date range if selected)
    let allClassesQuery = "SELECT class_id, class_title, create_at, renew_type FROM class_list WHERE 1=1";
    let allClassesParams: any[] = [];
    
    if (classId && classId !== "all") {
      allClassesQuery += " AND class_id = ?";
      allClassesParams.push(classId);
    }
    
    if (startDate && endDate) {
      allClassesQuery += ` AND (
        (renew_type = '30days' AND DATE_ADD(create_at, INTERVAL 30 DAY) >= ? AND create_at <= ?)
        OR (renew_type = '90days' AND DATE_ADD(create_at, INTERVAL 90 DAY) >= ? AND create_at <= ?)
        OR (renew_type NOT IN ('30days', '90days') AND create_at <= ?)
      )`;
      allClassesParams = [startDate, endDate, startDate, endDate, endDate];
    }
    
    allClassesQuery += " ORDER BY class_title ASC";
    
    const [allClassesResult] = await db.query(allClassesQuery, allClassesParams) as any;
    const allClasses = allClassesResult as any[];

    // 16. Students with Unpaid Fees (students without any approved payment)
    const [unpaidStudentsResult] = await db.query(
      `SELECT COUNT(DISTINCT u.uuid) as count
      FROM users u
      WHERE u.uuid NOT IN (
        SELECT DISTINCT student_uuid FROM payments WHERE status = 'approved'
      )`
    ) as any;
    const unpaidStudents = unpaidStudentsResult[0]?.count || 0;

    // 17. Class Performance Trends (Average marks over time)
    const [classPerformanceTrendsResult] = await db.query(
      `SELECT 
        DATE_FORMAT(sm.create_at, '%Y-%m') as month,
        AVG(sm.mark_a + sm.mark_b) as avg_marks
      FROM students_marks sm
      WHERE sm.create_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(sm.create_at, '%Y-%m')
      ORDER BY month ASC`
    );
    const classPerformanceTrends = classPerformanceTrendsResult as any[];

    // 18. Average Payment Per Student
    let avgPaymentQuery = `SELECT COALESCE(AVG(total_payments), 0) as avg_payment
      FROM (
        SELECT student_uuid, SUM(amount) as total_payments
        FROM payments
        WHERE status = 'approved'`;
    
    let avgPaymentParams: any[] = [];
    
    if (classId && classId !== "all") {
      avgPaymentQuery += ` AND item_id = ? AND item_type = 'class'`;
      avgPaymentParams.push(classId);
    }
    
    avgPaymentQuery += `
        GROUP BY student_uuid
      ) as student_totals`;
    
    const [avgPaymentResult] = await db.query(avgPaymentQuery, avgPaymentParams) as any;
    const avgPaymentPerStudent = avgPaymentResult[0]?.avg_payment || 0;

    // 19. Top Paying Students
    let topPayingQuery = `SELECT 
        u.uuid as student_uuid,
        u.student_id,
        CONCAT(u.first_name, ' ', u.last_name) as full_name,
        u.batch,
        SUM(p.amount) as total_paid,
        COUNT(p.payment_uuid) as payment_count
      FROM users u
      INNER JOIN payments p ON u.uuid = p.student_uuid
      WHERE p.status = 'approved'`;
    
    let topPayingParams: any[] = [];
    
    if (classId && classId !== "all") {
      topPayingQuery += ` AND p.item_id = ? AND p.item_type = 'class'`;
      topPayingParams.push(classId);
    }
    
    topPayingQuery += `
      GROUP BY u.uuid, u.student_id, u.first_name, u.last_name, u.batch
      ORDER BY total_paid DESC
      LIMIT 10`;
    
    const [topPayingStudentsResult] = await db.query(topPayingQuery, topPayingParams);
    const topPayingStudents = topPayingStudentsResult as any[];

    return NextResponse.json({
      summary: {
        totalStudents,
        activeStudents,
        totalRevenue,
        avgMarks: Math.round(avgMarks * 100) / 100,
        totalClasses,
        unpaidStudents,
        avgPaymentPerStudent: Math.round(avgPaymentPerStudent * 100) / 100,
      },
      paymentStatus,
      revenuePerClass,
      studentsPerClass,
      paymentsOverTime,
      topStudents,
      recentPayments,
      marksDistribution,
      paperAnalytics,
      newStudentsPerMonth,
      allClasses,
      classPerformanceTrends,
      topPayingStudents,
    });
  } catch (error) {
    console.error("Analytics API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
