const API = "http://10.149.222.126:8000";

async function testAPI() {
    try {
        const response = await fetch(API + "/home");

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const data = await response.json();

        console.log("API CONNECTED!");
        console.log(data);
    } catch (error) {
        console.error("API ERROR:", error);
    }
}

testAPI();

