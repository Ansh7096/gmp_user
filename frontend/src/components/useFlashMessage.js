import { useState, useCallback } from "react";

export default function useFlashMessage(timeout = 3500) {
  const [flash, setFlash] = useState({ message: "", type: "info" });

  const showFlash = useCallback((message, type = "info") => {
    setFlash({ message, type });
    setTimeout(() => setFlash({ message: "", type: "info" }), timeout);
  }, [timeout]);

  const clearFlash = useCallback(() => setFlash({ message: "", type: "info" }), []);

  return { flash, showFlash, clearFlash };
}
