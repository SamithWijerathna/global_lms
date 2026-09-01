import { getDBConnection } from "../../db";

export async function GET(req: Request) {
  const db = await getDBConnection();
  const url = new URL(req.url);
  const user_uuid = url.searchParams.get("user_uuid");
  const user_email = url.searchParams.get("user_email");

  if (!user_uuid && !user_email) {
    return new Response(JSON.stringify({ error: "Missing user_uuid or user_email" }), { status: 400 });
  }

  try {
    let query = "SELECT * FROM users WHERE ";
    let params: any[] = [];
    if (user_uuid && user_email) {
      query += "uuid = ? OR user_email = ?";
      params = [user_uuid, user_email];
    } else if (user_uuid) {
      query += "uuid = ?";
      params = [user_uuid];
    } else {
      query += "user_email = ?";
      params = [user_email];
    }

    const [rows] = await db.query(query, params);
    const user = (rows as any[])[0];

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({   
      uuid: user.uuid,
      student_id: user.student_id,
      first_name: user.first_name,
      last_name: user.last_name,
      batch: user.batch,
      birthday: user.birthday,
      phone: user.phone,
      profile_url: user.profile_url,
      user_email: user.user_email,
      user_address: user.user_address,
      id_number: user.id_number,
      create_at: user.create_at 
    }), { status: 200 });

  } catch (error) {
    console.error("Error fetching user:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
