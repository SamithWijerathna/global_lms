"use client";

import { createContext, useContext, useState, ReactNode } from "react";

import {Button, ButtonGroup} from "@heroui/button";
import {  Modal,  ModalContent,  ModalHeader,  ModalBody,  ModalFooter} from "@heroui/modal";

interface ConfirmOptions {
  title?: string;
  message?: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: "primary" | "danger" | "success" | "warning";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions & { onConfirm: () => void }) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function GlobalConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions & { onConfirm: () => void }>({
    title: "Confirm Action",
    message: "Are you sure?",
    confirmText: "Confirm",
    cancelText: "Cancel",
    confirmColor: "primary",
    onConfirm: () => {},
  });
  const [loading, setLoading] = useState(false);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions & { onConfirm: () => void }): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    setLoading(false);

    return new Promise((resolve) => {
      setResolvePromise(() => (value: boolean) => {
        resolve(value);
        setIsOpen(false);
      });
    });
  };

  const handleConfirm = async () => {
    setLoading(true);
    await options.onConfirm();
    setLoading(false);
    resolvePromise?.(true);
  };

  const handleCancel = () => {
    resolvePromise?.(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
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
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">{options.title}</ModalHeader>
              <ModalBody>
                <p className="text-default-700">{options.message}</p>
              </ModalBody>
              <ModalFooter>
               {options.cancelText && (
  <Button
    color="danger"
    variant="light"
    onPress={handleCancel}
    isDisabled={loading}
  >
    {options.cancelText}
  </Button>
)}

                <Button
                  color={options.confirmColor}
                  onPress={handleConfirm}
                  isLoading={loading}
                >
                  {options.confirmText}
                </Button>
              </ModalFooter>
            </>
          )}
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
  return context.confirm;
}