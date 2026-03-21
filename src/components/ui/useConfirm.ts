import { useContext } from "react";
import { ConfirmContext } from "./confirmContext";

export function useConfirm() {
  return useContext(ConfirmContext);
}
