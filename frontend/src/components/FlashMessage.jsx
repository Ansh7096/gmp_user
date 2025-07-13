import React from "react";

const FlashMessage = ({ message, type, onClose }) => {
  if (!message) return null;

  return (
    <div className={`flash-message ${type || "info"}`} style={{
      position: "fixed",
      top: 20,
      right: 20,
      zIndex: 9999,
      padding: "16px 24px",
      borderRadius: "8px",
      background: type === "error" ? "#ffdddd" : type === "success" ? "#ddffdd" : "#ddeeff",
      color: type === "error" ? "#a00" : type === "success" ? "#070" : "#004",
      boxShadow: "0 2px 8px rgba(174, 80, 80, 0.15)",
      minWidth: 220,
      maxWidth: 600,
      width: 'fit-content',
      display: "flex",
      alignItems: "center"
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{
        background: "transparent",
        border: "none",
        color: "inherit",
        fontWeight: "bold",
        fontSize: 18,
        marginLeft: 16,
        cursor: "pointer"
      }}>&times;</button>
    </div>
  );
};

export default FlashMessage;
