import { cn } from "@/lib/utils";
function Skeleton({ className, ...props }) {
  return /* @__PURE__ */ React.createElement("div", { className: cn("animate-pulse rounded-md bg-primary/10", className), ...props });
}
export {
  Skeleton
};
