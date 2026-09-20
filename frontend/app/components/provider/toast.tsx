import { Toaster } from "sonner";
import { useTheme } from "./theme";

const ToastProvider = () => {
  const { theme } = useTheme();
  return <Toaster theme={theme} richColors closeButton position="top-right" />;
};

export default ToastProvider;
