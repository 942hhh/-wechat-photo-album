"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useApiMutation } from "@/hooks/useApiMutation";

interface CreateAlbumDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateAlbumDialog({
  open,
  onClose,
  onCreated,
}: CreateAlbumDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { mutate, isLoading } = useApiMutation();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await mutate("/api/albums", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      setName("");
      setDescription("");
      onCreated();
      onClose();
    } catch {
      // Error handled by hook
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="新建相册">
      <div className="flex flex-col gap-4">
        <Input
          label="相册名称"
          placeholder="比如：2025年春节"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          autoFocus
        />
        <Input
          label="描述（选填）"
          placeholder="这个相册是关于什么的？"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
        <Button
          className="w-full"
          onClick={handleCreate}
          loading={isLoading}
          disabled={!name.trim()}
        >
          创建相册
        </Button>
      </div>
    </Modal>
  );
}
