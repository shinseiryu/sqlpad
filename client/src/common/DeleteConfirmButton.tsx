import * as Dialog from '@radix-ui/react-dialog';
import { DeleteIcon } from './icons';
import React, { useRef, useState } from 'react';
import Button from './Button';
import styles from './DeleteConfirmButton.module.css';
import IconButton from './IconButton';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onConfirm: () => void;
  confirmMessage: string;
  icon?: boolean;
}

export type Ref = HTMLButtonElement;

const DeleteConfirmButton = React.forwardRef<Ref, ButtonProps>(
  (
    {
      children,
      confirmMessage,
      onConfirm,
      className,
      icon,
      ...rest
    }: ButtonProps,
    ref,
  ) => {
    const [visible, setVisible] = useState(false);
    const cancelEl = useRef<HTMLButtonElement>(null);

    return (
      <>
        {icon ? (
          <IconButton
            onClick={() => setVisible(true)}
            ref={ref}
            variant="danger"
            aria-label={typeof children === 'string' ? children : 'Delete'}
            {...rest}
          >
            <DeleteIcon />
          </IconButton>
        ) : (
          <Button
            onClick={() => setVisible(true)}
            ref={ref}
            variant="danger"
            {...rest}
          >
            {children}
          </Button>
        )}
        <Dialog.Root open={visible} onOpenChange={setVisible}>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay">
              <Dialog.Content
                role="alertdialog"
                className={`dialog-content ${styles.Dialog}`}
                aria-describedby={undefined}
                onOpenAutoFocus={(event) => {
                  event.preventDefault();
                  cancelEl.current?.focus();
                }}
              >
                <Dialog.Title className={styles.dialogContent}>
                  {confirmMessage}
                </Dialog.Title>
                <div className={styles.buttonWrapper}>
                  <Button
                    variant="danger"
                    className={styles.button}
                    onClick={() => {
                      setVisible(false);
                      onConfirm();
                    }}
                  >
                    Delete
                  </Button>
                  <Button
                    ref={cancelEl}
                    className={styles.button}
                    onClick={() => setVisible(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Overlay>
          </Dialog.Portal>
        </Dialog.Root>
      </>
    );
  },
);

export default DeleteConfirmButton;
