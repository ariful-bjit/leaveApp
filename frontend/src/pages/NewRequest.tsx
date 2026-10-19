import { useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Group,
  Paper,
  Radio,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { ApiError, type FieldErrors } from "../api/client";
import { createRequest, getBalance } from "../api/requests";
import type { Balance, Duration, Half } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { formatDays } from "../lib/format";
import { requestDays } from "../lib/workingDays";

const REASON_MAX = 500;

export default function NewRequest() {
  const { me } = useAuth();
  const navigate = useNavigate();
  const [duration, setDuration] = useState<Duration>("FULL_DAY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [half, setHalf] = useState<Half>("MORNING");
  const [reason, setReason] = useState("");
  const [balance, setBalance] = useState<Balance | null>(null);
  const [balanceFailed, setBalanceFailed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isHalfDay = duration === "HALF_DAY";
  const effectiveEnd = isHalfDay ? startDate : endDate;
  const year = startDate ? Number(startDate.slice(0, 4)) : undefined;
  const days = requestDays(duration, startDate, effectiveEnd);
  const today = dayjs().format("YYYY-MM-DD");

  useEffect(() => {
    if (!me?.has_manager) return;
    let active = true;
    getBalance(year)
      .then((b) => {
        if (!active) return;
        setBalance(b);
        setBalanceFailed(false);
      })
      .catch(() => {
        if (!active) return;
        setBalance(null);
        setBalanceFailed(true);
      });
    return () => {
      active = false;
    };
  }, [me?.has_manager, year]);

  if (!me?.has_manager) {
    return (
      <Stack maw={640}>
        <Title order={1}>Request leave</Title>
        <Alert color="yellow" variant="light" title="Cannot request leave">
          You have no manager assigned. Contact an administrator.
        </Alert>
      </Stack>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      await createRequest({
        start_date: startDate,
        end_date: effectiveEnd,
        duration,
        half: isHalfDay ? half : null,
        reason,
      });
      notifications.show({
        color: "green",
        title: "Leave request submitted",
        message: "Your manager will review it.",
      });
      navigate("/requests");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        const { non_field_errors, ...fields } = err.fieldErrors;
        setErrors(fields);
        setFormError(non_field_errors?.join(" ") ?? null);
      } else {
        setFormError(err instanceof Error ? err.message : "Could not submit the request.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const fieldError = (name: string) => errors[name]?.join(" ");

  return (
    <Stack maw={640}>
      <Title order={1}>Request leave</Title>
      <Paper withBorder radius="md" p="lg">
        <form onSubmit={handleSubmit} noValidate>
          <Stack>
            {formError && (
              <Alert color="red" variant="light" role="alert">
                {formError}
              </Alert>
            )}

            <div>
              <Text size="sm" fw={500} mb={4} id="duration-label">
                Duration
              </Text>
              <SegmentedControl
                aria-labelledby="duration-label"
                value={duration}
                onChange={(value) => setDuration(value as Duration)}
                data={[
                  { value: "FULL_DAY", label: "Full day" },
                  { value: "HALF_DAY", label: "Half day" },
                ]}
              />
            </div>

            {isHalfDay ? (
              <SimpleGrid cols={{ base: 1, xs: 2 }}>
                <TextInput
                  type="date"
                  label="Date"
                  required
                  min={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.currentTarget.value)}
                  error={fieldError("start_date") ?? fieldError("end_date")}
                />
                <Radio.Group
                  label="Part of day"
                  required
                  value={half}
                  onChange={(value) => setHalf(value as Half)}
                  error={fieldError("half")}
                >
                  <Group mt={8}>
                    <Radio value="MORNING" label="Morning" />
                    <Radio value="AFTERNOON" label="Afternoon" />
                  </Group>
                </Radio.Group>
              </SimpleGrid>
            ) : (
              <SimpleGrid cols={{ base: 1, xs: 2 }}>
                <TextInput
                  type="date"
                  label="Start date"
                  required
                  min={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.currentTarget.value)}
                  error={fieldError("start_date")}
                />
                <TextInput
                  type="date"
                  label="End date"
                  required
                  min={startDate || today}
                  value={endDate}
                  onChange={(e) => setEndDate(e.currentTarget.value)}
                  error={fieldError("end_date")}
                />
              </SimpleGrid>
            )}

            <Textarea
              label="Reason (optional)"
              autosize
              minRows={3}
              maxLength={REASON_MAX}
              value={reason}
              onChange={(e) => setReason(e.currentTarget.value)}
              description={`${reason.length}/${REASON_MAX} characters`}
              error={fieldError("reason")}
            />

            <Paper bg="indigo.0" radius="md" p="sm">
              <Text size="sm" aria-live="polite">
                <Text span fw={600}>
                  {formatDays(days)} working {days === 1 ? "day" : "days"}
                </Text>
                {balance && (
                  <>
                    {" · "}
                    {formatDays(balance.available)} days available in {balance.year}
                  </>
                )}
              </Text>
              {balanceFailed && (
                <Text size="sm" c="orange.9" mt={4}>
                  Could not load your available balance. You can still submit; the server will
                  check it.
                </Text>
              )}
            </Paper>

            <Group justify="flex-end">
              <Button variant="default" onClick={() => navigate("/requests")}>
                Back
              </Button>
              <Button type="submit" loading={submitting} disabled={days === 0}>
                Submit request
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
}
