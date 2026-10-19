import { Paper, SimpleGrid, Text } from "@mantine/core";
import type { Balance } from "../api/types";
import { formatDays } from "../lib/format";

const CARDS: { key: keyof Omit<Balance, "year" | "available">; label: string; hint: string }[] = [
  { key: "allowance", label: "Allowance", hint: "days this year" },
  { key: "used", label: "Used", hint: "approved days" },
  { key: "pending", label: "Pending", hint: "awaiting approval" },
  { key: "remaining", label: "Remaining", hint: "days left" },
];

export function BalanceCards({ balance }: { balance: Balance }) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }}>
      {CARDS.map(({ key, label, hint }) => (
        <Paper
          key={key}
          withBorder
          radius="md"
          p="md"
          role="group"
          aria-label={label}
          bg={key === "remaining" ? "indigo.0" : undefined}
        >
          <Text size="xs" tt="uppercase" fw={600} c="dimmed">
            {label}
          </Text>
          <Text fz={32} fw={700} lh={1.2} c={key === "remaining" ? "indigo.7" : undefined}>
            {formatDays(balance[key])}
          </Text>
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
