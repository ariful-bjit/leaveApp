import type { ReactNode } from "react";
import { Group, Modal } from "@mantine/core";

/**
 * Centered dialog used across the app.
 *
 * Built from Modal parts because Mantine's default Modal renders its title bar as a <header>
 * (read as a second page banner) and an unlabelled close button.
 */
export function AppModal({
  opened,
  onClose,
  title,
  children,
}: {
  opened: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Modal.Root opened={opened} onClose={onClose} centered>
      <Modal.Overlay />
      <Modal.Content>
        <Group justify="space-between" wrap="nowrap" px="md" pt="md" pb="xs">
          <Modal.Title fw={600}>{title}</Modal.Title>
          <Modal.CloseButton aria-label="Close dialog" />
        </Group>
        <Modal.Body>{children}</Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
