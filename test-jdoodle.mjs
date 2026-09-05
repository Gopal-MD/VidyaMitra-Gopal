import "dotenv/config";

const clientId = process.env.JDOODLE_CLIENT_ID?.trim();
const clientSecret = process.env.JDOODLE_CLIENT_SECRET?.trim();

console.log("Credentials loaded:", {
    clientId: !!clientId,
    clientSecret: !!clientSecret
});

if (!clientId || !clientSecret) {
    console.error("❌ JDoodle credentials missing from .env");
    process.exit(1);
}

const response = await fetch(
    "https://api.jdoodle.com/v1/execute",
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            clientId,
            clientSecret,
            script: 'print("Hello from JDoodle")',
            language: "python3",
            versionIndex: "0"
        })
    }
);

const data = await response.json();

console.log("HTTP Status:", response.status);
console.log("JDoodle Response:", data);