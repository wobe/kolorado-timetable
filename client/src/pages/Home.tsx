import Timetable from "@/components/Timetable";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  return (
    <div style={{ position: "relative" }}>
      <Timetable />
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 999 }}>
        <button
          onClick={() => setLocation("/lineup")}
          style={{
            padding: "8px 16px", borderRadius: 9999, border: "none", cursor: "pointer",
            background: "#E8FF6B", color: "#062322",
            fontFamily: "'Pacaembu', sans-serif", fontSize: 13,
            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          }}
        >
          → Előadók
        </button>
      </div>
    </div>
  );
}
