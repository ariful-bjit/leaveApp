import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { approveRequest, listTeamRequests, rejectRequest } from "../api/team";
import type { TeamRequest } from "../api/types";
import { AppModal } from "../components/AppModal";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { formatDateRange, formatDays, formatDuration } from "../lib/format";

const COMMENT_MAX = 500;

type Action = "approve" | "reject";

const DIALOG: Record<
  Action,
  { title: string; label: string; required: boolean; confirm: string; color: string }
> = {
  approve: {
    title: "Approve leave request",
    label: "Comment (optional)",
    required: false,
    confirm: "Approve request",
    color: "green",
  },
  reject: {
    title: "Reject leave request",
    label: "Reason for rejection",
    required: true,
    confirm: "Reject request",
    color: "red",
  },
};

export default function Team() {
  const [requests, setRequests] = useState<TeamRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deciding, setDeciding] = useState<{ request: TeamRequest; action: Action } | null>(null);
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      setRequests(await listTeamRequests("PENDING"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load team requests.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function closeDialog() {
    setDeciding(null);
    setComment("");
  }

  async function decide(request: TeamRequest, action: Action, text: string) {
    setBusyId(request.id);
    try {
      if (action === "approve") {
        await approveRequest(request.id, text || undefined);
      } else {
        await rejectRequest(request.id, text);
      }
      notifications.show({
        color: action === "approve" ? "green" : "gray",
        title: action === "approve" ? "Request approved" : "Request rejected",
        message: `${request.employee.name} · ${formatDateRange(request.start_date, request.end_date)}`,
      });
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Could not save the decision",
        message: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyId(null);
      closeDialog();
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
        title="No pending requests"
        message="Leave requests from your team that need a decision will appear here."
      />
    );
  } else {
    content = (
      <Paper withBorder radius="md">
        <ScrollArea type="auto">
          <Table verticalSpacing="sm" horizontalSpacing="md" miw={860} highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Employee</Table.Th>
                <Table.Th>Dates</Table.Th>
                <Table.Th>Duration</Table.Th>
                <Table.Th>Days</Table.Th>
                <Table.Th>Reason</Table.Th>
                <Table.Th>Remaining balance</Table.Th>
                <Table.Th>
                  <VisuallyHidden>Actions</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {requests.map((request) => {
                const who = request.employee.name;
                const busy = busyId === request.id;
                return (
                  <Table.Tr key={request.id}>
                    <Table.Td fw={500}>{who}</Table.Td>
                    <Table.Td>{formatDateRange(request.start_date, request.end_date)}</Table.Td>
                    <Table.Td>{formatDuration(request)}</Table.Td>
                    <Table.Td>{formatDays(request.working_days)}</Table.Td>
                    <Table.Td maw={240}>
                      {request.reason ? (
                        <Text size="sm">{request.reason}</Text>
                      ) : (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>{formatDays(request.employee_balance.remaining)} days</Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <Button
                          size="xs"
                          color="green"
                          loading={busy}
                          disabled={busyId !== null && !busy}
                          aria-label={`Approve request from ${who}`}
                          onClick={() => setDeciding({ request, action: "approve" })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="outline"
                          disabled={busyId !== null}
                          aria-label={`Reject request from ${who}`}
                          onClick={() => setDeciding({ request, action: "reject" })}
                        >
                          Reject
                        </Button>
                      </Group>
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
      <div>
        <Title order={1}>Team requests</Title>
        <Text c="dimmed" size="sm">
          Pending leave requests from your direct reports.
        </Text>
      </div>
      {content}

      <AppModal
        opened={deciding !== null}
        onClose={closeDialog}
        title={deciding ? DIALOG[deciding.action].title : ""}
      >
        {deciding && (
          <Stack>
            <Text size="sm">
              {deciding.request.employee.name} ·{" "}
              {formatDateRange(deciding.request.start_date, deciding.request.end_date)} ·{" "}
              {formatDays(deciding.request.working_days)} days
            </Text>
            <Textarea
              label={DIALOG[deciding.action].label}
              description="The employee will see this comment."
              required={DIALOG[deciding.action].required}
              autosize
              minRows={3}
              maxLength={COMMENT_MAX}
              value={comment}
              onChange={(e) => setComment(e.currentTarget.value)}
              data-autofocus
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeDialog}>
                Keep pending
              </Button>
              <Button
                color={DIALOG[deciding.action].color}
                disabled={DIALOG[deciding.action].required && comment.trim() === ""}
                loading={busyId === deciding.request.id}
                onClick={() => decide(deciding.request, deciding.action, comment.trim())}
              >
                {DIALOG[deciding.action].confirm}
              </Button>
            </Group>
          </Stack>
        )}
      </AppModal>
    </Stack>
  );
}
