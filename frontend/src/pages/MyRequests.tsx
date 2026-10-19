import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Link } from "react-router-dom";
import { cancelRequest, listMyRequests } from "../api/requests";
import type { LeaveRequest } from "../api/types";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateRange, formatDays, formatDuration } from "../lib/format";

export default function MyRequests() {
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toCancel, setToCancel] = useState<LeaveRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRequests(await listMyRequests());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your requests.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmCancel() {
    if (!toCancel) return;
    setCancelling(true);
    try {
      await cancelRequest(toCancel.id);
      notifications.show({ color: "green", title: "Request cancelled", message: "" });
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Could not cancel",
        message: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setCancelling(false);
      setToCancel(null);
      load();
    }
  }

  let content;
  if (error) {
    content = <ErrorState message={error} onRetry={load} />;
  } else if (requests === null) {
    content = <LoadingState />;
  } else if (requests.length === 0) {
    content = (
      <EmptyState
        title="No leave requests yet"
        message="When you request leave, it will appear here with its status."
        action={
          <Button component={Link} to="/requests/new">
            Request leave
          </Button>
        }
      />
    );
  } else {
    content = (
      <Paper withBorder radius="md">
        <ScrollArea type="auto">
          <Table verticalSpacing="sm" horizontalSpacing="md" miw={720} highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Dates</Table.Th>
                <Table.Th>Duration</Table.Th>
                <Table.Th>Days</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Manager comment</Table.Th>
                <Table.Th>
                  <VisuallyHidden>Actions</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {requests.map((request) => {
                const dates = formatDateRange(request.start_date, request.end_date);
                return (
                  <Table.Tr key={request.id}>
                    <Table.Td>{dates}</Table.Td>
                    <Table.Td>{formatDuration(request)}</Table.Td>
                    <Table.Td>{formatDays(request.working_days)}</Table.Td>
                    <Table.Td>
                      <StatusBadge status={request.status} />
                    </Table.Td>
                    <Table.Td>
                      {request.decision_comment ? (
                        <Text size="sm">{request.decision_comment}</Text>
                      ) : (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      {request.status === "PENDING" && (
                        <Button
                          size="xs"
                          variant="subtle"
                          color="red"
                          aria-label={`Cancel request for ${dates}`}
                          onClick={() => setToCancel(request)}
                        >
                          Cancel
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>
    );
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={1}>My requests</Title>
        <Button component={Link} to="/requests/new">
          Request leave
        </Button>
      </Group>
      {content}

      <Modal
        opened={toCancel !== null}
        onClose={() => setToCancel(null)}
        title="Cancel this leave request?"
        centered
      >
        <Stack>
          {toCancel && (
            <Text size="sm">
              {formatDateRange(toCancel.start_date, toCancel.end_date)} ·{" "}
              {formatDuration(toCancel)} · {formatDays(toCancel.working_days)} days
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setToCancel(null)}>
              Keep request
            </Button>
            <Button color="red" loading={cancelling} onClick={confirmCancel}>
              Cancel request
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
