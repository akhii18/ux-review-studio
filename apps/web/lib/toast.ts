import { toast as sonnerToast, type ExternalToast } from "sonner";
import type { ReactNode } from "react";

type ToastMessage = ReactNode;

function showLatest(
  fn: (message: ToastMessage, data?: ExternalToast) => string | number,
  message: ToastMessage,
  data?: ExternalToast,
) {
  sonnerToast.dismiss();
  return fn(message, data);
}

export const toast = {
  ...sonnerToast,
  success: (message: ToastMessage, data?: ExternalToast) => showLatest(sonnerToast.success, message, data),
  error: (message: ToastMessage, data?: ExternalToast) => showLatest(sonnerToast.error, message, data),
  info: (message: ToastMessage, data?: ExternalToast) => showLatest(sonnerToast.info, message, data),
  warning: (message: ToastMessage, data?: ExternalToast) => showLatest(sonnerToast.warning, message, data),
  message: (message: ToastMessage, data?: ExternalToast) => showLatest(sonnerToast.message, message, data),
};
