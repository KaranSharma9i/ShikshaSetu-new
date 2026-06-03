import { Alert } from "react-native";

export function handleError(error: any, contextDescription?: string) {
  console.warn(`[Error] ${contextDescription ? `${contextDescription}: ` : ""}`, error);

  let userMessage = error?.message || "An unexpected error occurred. Please try again.";

  if (error) {
    const msg = (error.message || String(error)).toLowerCase();
    
    if (msg.includes("failed to fetch") || msg.includes("network request failed")) {
      userMessage = "Network connection failed. Please check your internet connection and try again.";
    } else if (msg.includes("invalid login credentials") || msg.includes("invalid-credential") || msg.includes("invalid credentials")) {
      userMessage = "Invalid credentials. Please double check your details.";
    } else if (msg.includes("jwt expired") || msg.includes("token expired")) {
      userMessage = "Your session has expired. Please sign in again.";
    } else if (msg.includes("foreign key") || msg.includes("violates foreign key constraint")) {
      userMessage = "Referenced record could not be found. Please contact administration.";
    } else if (msg.includes("unique constraint") || msg.includes("already exists")) {
      userMessage = "A record with this information already exists in the system.";
    } else if (msg.includes("row-level security") || msg.includes("policy") || msg.includes("permission denied")) {
      userMessage = "You do not have permission to perform this action.";
    }
  }

  Alert.alert(
    contextDescription ? contextDescription : "Notice",
    userMessage,
    [{ text: "OK" }]
  );
}
