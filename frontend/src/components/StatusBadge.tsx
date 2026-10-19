import { Badge } from "@mantine/core";
import type { Status } from "../api/types";

export const STATUS_STYLE: Record<Status, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "yellow" },
  APPROVED: { label: "Approved", color: "green" },
  REJECTED: { label: "Rejected", color: "red" },
  CANCELLED: { label: "Cancelled", color: "gray" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, color } = STATUS_STYLE[status];
  return (
    <Badge color={color} variant="light" radius="sm">
      {label}
    </Badge>
  );
}
