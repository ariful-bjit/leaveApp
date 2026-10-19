import type { ReactNode } from "react";
import { Alert, Button, Center, Paper, Skeleton, Stack, Text, Title } from "@mantine/core";

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <Stack gap="sm" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={40} radius="md" />
      ))}
    </Stack>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <Paper withBorder p="xl" radius="md">
      <Center>
        <Stack align="center" gap="xs" maw={420} ta="center">
          <Title order={3}>{title}</Title>
          {message && <Text c="dimmed">{message}</Text>}
          {action}
        </Stack>
      </Center>
    </Paper>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert color="red" variant="light" title="Something went wrong" role="alert">
      <Stack gap="sm" align="flex-start">
        <Text size="sm">{message}</Text>
        {onRetry && (
          <Button size="xs" variant="white" color="red" onClick={onRetry}>
            Try again
          </Button>
        )}
      </Stack>
    </Alert>
  );
}
