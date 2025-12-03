const API_URL = "http://127.0.0.1:8000/query"; 
// Change 127.0.0.1 → your public Cloud Shell address if needed

document.getElementById("sendBtn").addEventListener("click", async () => {
    const input = document.getElementById("userInput").value.trim();
    const responseBox = document.getElementById("responseBox");

    if (!input) {
        responseBox.innerText = "Please enter a question.";
        return;
    }

    responseBox.innerText = "Thinking...";

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: input })
        });

        if (!res.ok) {
            responseBox.innerText = "Server error: " + res.status;
            return;
        }

        const data = await res.json();
        responseBox.innerText = data.response;
    } catch (err) {
        responseBox.innerText = "Could not connect to backend.";
        console.error(err);
    }
});
