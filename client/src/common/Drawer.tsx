import * as Dialog from '@radix-ui/react-dialog';
import CloseIcon from 'mdi-react/CloseIcon';
import React from 'react';
import styles from './Drawer.module.css';
import IconButton from './IconButton';

export interface Props extends React.HTMLAttributes<HTMLElement> {
  title: string;
  visible?: boolean;
  placement: 'right' | 'left';
  width: number | string;
  onClose: () => void;
}

function Drawer({
  title,
  visible,
  onClose,
  width,
  placement,
  children,
}: Props) {
  const style: React.CSSProperties = {
    width,
  };

  if (placement === 'right') {
    style.right = 0;
  } else {
    style.left = 0;
  }

  return (
    <Dialog.Root
      open={Boolean(visible)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay">
          <Dialog.Content
            className={`dialog-content ${styles.Dialog}`}
            style={style}
            aria-describedby={undefined}
          >
            <div className={styles.titleWrapper}>
              <Dialog.Title className={styles.title}>{title}</Dialog.Title>
              <Dialog.Close asChild>
                <IconButton aria-label="Close">
                  <CloseIcon />
                </IconButton>
              </Dialog.Close>
            </div>
            <div className={styles.dialogBody}>{children}</div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default Drawer;
