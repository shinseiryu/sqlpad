import * as Dialog from '@radix-ui/react-dialog';
import CloseIcon from 'mdi-react/CloseIcon';
import React from 'react';
import styles from './Modal.module.css';
import IconButton from './IconButton';

export interface Props extends React.HTMLAttributes<HTMLElement> {
  title: string;
  visible?: boolean;
  onClose?: () => void;
  width: string | number;
  initialFocusRef?: React.RefObject<any>;
}

function Modal({
  title,
  visible,
  onClose,
  width,
  initialFocusRef,
  children,
}: Props) {
  return (
    <Dialog.Root
      open={Boolean(visible)}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay">
          <Dialog.Content
            className={`dialog-content ${styles.Dialog}`}
            style={{ width }}
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => {
              if (initialFocusRef?.current) {
                event.preventDefault();
                initialFocusRef.current.focus();
              }
            }}
          >
            <div className={styles.titleWrapper}>
              <Dialog.Title className={styles.title}>{title}</Dialog.Title>
              {onClose && (
                <Dialog.Close asChild>
                  <IconButton aria-label="Close">
                    <CloseIcon />
                  </IconButton>
                </Dialog.Close>
              )}
            </div>
            <div className={styles.dialogBody}>{children}</div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default Modal;
