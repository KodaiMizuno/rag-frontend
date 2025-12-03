// utils/api.js
export async function apiGet(endpoint) {
    const token = localStorage.getItem("token");
  
    const res = await fetch(`http://<BACKEND_URL>/${endpoint}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
  
    if (!res.ok) {
      throw new Error("API error");
    }
  
    return res.json();
  }
  