import "./App.css";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";


function PaymentDemo() {
    const pay = useAction(api.example.pay);
    const verify = useAction(api.example.verifyPayment);
    const [email, setEmail] = useState("test@example.com");
    const [amount, setAmount] = useState(10); // 10 NGN
    const [lastRef, setLastRef] = useState("");
    const [status, setStatus] = useState("");

    const handlePay = async () => {
        try {
            const result = await pay({
                amount,
                email,
                reference: "" + Math.floor(Math.random() * 1000000000 + Date.now()),
            });
            console.log("Pay result:", result);
            setLastRef(result.reference);
            // Open payment page
            if (result.authorization_url) {
                window.open(result.authorization_url, "_blank");
            }
        } catch (e: any) {
            console.error(e);
            alert("Payment init failed: " + e.message);
        }
    };

    const handleVerify = async () => {
        if (!lastRef) return;
        try {
            const result = await verify({ reference: lastRef });
            console.log("Verify result:", result);
            setStatus(result.status);
            alert(`Payment status: ${result.status}`);
        } catch (e: any) {
            console.error(e);
            alert("Verify failed: " + e.message);
        }
    };

    return (
        <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>
            <h2>Paystack Demo</h2>
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="Email" 
                />
                <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(Number(e.target.value))} 
                    placeholder="Amount (NGN)" 
                />
                <button onClick={handlePay}>Pay Now</button>
            </div>
            {lastRef && (
                <div style={{ marginTop: "10px" }}>
                    <p>Last Reference: <strong>{lastRef}</strong></p>
                    <button onClick={handleVerify}>Verify Payment</button>
                    {status && <span style={{ marginLeft: "10px" }}>Status: {status}</span>}
                </div>
            )}
        </div>
    );
}

function App() {
  // Construct the HTTP endpoint URL
  // Replace .convex.cloud with .convex.site for HTTP endpoints
  const convexUrl = import.meta.env.VITE_CONVEX_URL.replace(".cloud", ".site");

  return (
    <>
      <h1>Example App</h1>
      <PaymentDemo />
    </>
  );
}

export default App;
