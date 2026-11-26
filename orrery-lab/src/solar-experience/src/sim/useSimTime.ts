import { useEffect, useState } from "react";
import { clock } from "@/sim/store";

export function useSimTime(hz = 4) {
  const [t, setT] = useState(clock.t);
  useEffect(() => {
    const id = window.setInterval(() => setT(clock.t), 1000 / hz);
    return () => window.clearInterval(id);
  }, [hz]);
  return t;
}
