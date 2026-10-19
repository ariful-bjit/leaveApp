import { useCallback, useEffect, useState } from "react";
import { Anchor, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import { getBalance, listMyRequests } from "../api/requests";
import type { Balance, LeaveRequest } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { BalanceCards } from "../components/BalanceCards";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateRange, formatDays, formatDuration } from "../lib/format";

const RECENT_COUNT = 5;

export default function Dashboard() {
  const { me } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [b, r] = await Promise.all([getBalance(), listMyRequests()]);
      setBalance(b);
      setRequests(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your dashboard.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const firstName = me?.name.split(" ")[0] ?? "";
  const requestButton = (
    <Button component={Link} to="/requests/new">
      Request leave
    </Button>
  );

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!balance || !requests) return <LoadingState rows={4} />;

  const recent = requests.slice(0, RECENT_COUNT);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={1}>Hello, {firstName}</Title>
          <Text c="dimmed" size="sm">
            Your annual leave for {balance.year}
          </Text>
        </div>
        {requestButton}
      </Group>

      <BalanceCards balance={balance} />

      <Stack gap="xs">
        <Group justify="space-between">
          <Title order={2} size="h3">
            Recent requests
          </Title>
          {recent.length > 0 && (
            <Anchor component={Link} to="/requests" size="sm">
              View all requests
            </Anchor>
          )}
        </Group>

        {recent.length === 0 ? (
          <EmptyState
            title="No leave requests yet"
            message="Plan some time off — your requests and their status will show here."
          />
        ) : (
          <Paper withBorder radius="md">
            <ul aria-label="Recent requests" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {recent.map((request, index) => (
                <li
                  key={request.id}
                  style={{
                    borderTop: index === 0 ? undefined : "1px solid var(--mantine-color-gray-2)",
                  }}
                >
                  <Group justify="space-between" px="md" py="sm" wrap="nowrap">
                    <div>
                      <Text size="sm" fw={500}>
                        {formatDateRange(request.start_date, request.end_date)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatDuration(request)} · {formatDays(request.working_days)}{" "}
                        {Number(request.working_days) === 1 ? "day" : "days"}
                      </Text>
                    </div>
                    <StatusBadge status={request.status} />
                  </Group>
                </li>
              ))}
            </ul>
          </Paper>
        )}
      </Stack>
    </Stack>
  );
}
