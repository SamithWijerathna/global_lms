"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";

interface ConfirmOptions {
  title?: string;
  message?: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: "primary" | "danger" | "success" | "warning";
  onConfirm?: () => void | Promise<void>;
}

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean> | undefined>(undefined);

export function GlobalConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setIsOpen(true);
      setLoading(false);
      setResolvePromise(() => (value: boolean) => {
        resolve(value);
        setIsOpen(false);
      });
    });
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (options.onConfirm) {
        await options.onConfirm();
      }
      resolvePromise?.(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    resolvePromise?.(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => !open && handleCancel()}
        backdrop="opaque"
        classNames={{
          backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
        }}
      >
        <ModalContent>
          <ModalHeader>{options.title || "Confirm Action"}</ModalHeader>
          <ModalBody>
            <p className="text-default-700">
              {options.message || "Are you sure you want to continue?"}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={handleCancel}
              isDisabled={loading}
            >
              {options.cancelText || "Cancel"}
            </Button>
            <Button
              color={options.confirmColor || "primary"}
              onPress={handleConfirm}
              isLoading={loading}
            >
              {options.confirmText || "Confirm"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within GlobalConfirmProvider");
  }
  return context;
}