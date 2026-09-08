// Fetch all class materials
export async function fetchClassMaterials() {
  const res = await fetch("/api/class-materials");
  return res.json();
}
// Fetch paper rank for a student and paper
export async function fetchPaperRank(student_uuid: string, paper_id: string) {
  const res = await fetch(`/api/paper/rank?student_uuid=${student_uuid}&paper_id=${paper_id}`);
  return res.json();
}
export async function fetchDashboardStats() {
  // Example: return fetch("/api/dashboard").then(res => res.json());
}

export async function fetchPerformance() {
  // Example: return fetch("/api/dashboard/performance").then(res => res.json());
}

export async function fetchClassStore() {
  const res = await fetch("/api/class-store");
  return res.json();
}

export async function fetchMyClasses() {
  const res = await fetch("/api/dashboard/class", {
    method: "POST",
    body: JSON.stringify({ action: "classes" }),
    headers: { "Content-Type": "application/json" }
  });
  return res.json();
}

export async function fetchQuizzes() {
  const res = await fetch("/api/quizzes");
  return res.json();
}


export async function fetchProfile() {
  const res = await fetch("/api/dashboard/user?user_uuid=me");
  return res.json();
}

export async function fetchPaymentSettings() {
  const res = await fetch("/api/payment/info");
  return res.json();
}

export async function fetchPaymentHistory() {
  const res = await fetch("/api/payment");
  return res.json();
}
