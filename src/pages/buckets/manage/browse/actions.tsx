import { FolderPlus, FolderUp, UploadIcon } from "lucide-react";
import Button from "@/components/ui/button";
import { usePutObject } from "./hooks";
import { toast } from "sonner";
import { handleError } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useBucketContext } from "../context";
import { useDisclosure } from "@/hooks/useDisclosure";
import { Dropdown, Modal } from "react-daisyui";
import { createFolderSchema, CreateFolderSchema } from "./schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InputField } from "@/components/ui/input";
import { useEffect } from "react";

type Props = {
  prefix: string;
};

const Actions = ({ prefix }: Props) => {
  const { bucketName } = useBucketContext();
  const queryClient = useQueryClient();

  const putObject = usePutObject(bucketName, {
    onSuccess: () => {
      toast.success("File uploaded!");
      queryClient.invalidateQueries({ queryKey: ["browse", bucketName] });
    },
    onError: handleError,
  });

  const onUploadFiles = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files?.length) return;

      if (files.length > 100) {
        toast.error("You can only upload up to 100 files at a time");
        return;
      }

      toast.info(`Uploading ${files.length} file${files.length > 1 ? "s" : ""}...`);
      for (const file of files) {
        const key = prefix + file.name;
        putObject.mutate({ key, file });
      }
    };

    input.click();
    input.remove();
  };

  const onUploadFolder = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    (input as any).webkitdirectory = true;

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files?.length) return;

      if (files.length > 500) {
        toast.error("Folder contains too many files (max 500)");
        return;
      }

      toast.info(`Uploading folder with ${files.length} file${files.length > 1 ? "s" : ""}...`);
      let completed = 0;
      for (const file of files) {
        const relativePath = (file as any).webkitRelativePath || file.name;
        const key = prefix + relativePath;
        putObject.mutate(
          { key, file },
          {
            onSuccess: () => {
              completed++;
              if (completed === files.length) {
                toast.success(`Folder uploaded! (${files.length} files)`);
              }
            },
          }
        );
      }
    };

    input.click();
    input.remove();
  };

  return (
    <>
      <CreateFolderAction prefix={prefix} />
      <Dropdown end>
        <Dropdown.Toggle button={false}>
          <Button icon={UploadIcon} color="ghost" title="Upload" />
        </Dropdown.Toggle>
        <Dropdown.Menu className="gap-y-1 min-w-[170px]">
          <Dropdown.Item onClick={onUploadFiles}>
            <UploadIcon size={16} /> Upload Files
          </Dropdown.Item>
          <Dropdown.Item onClick={onUploadFolder}>
            <FolderUp size={16} /> Upload Folder
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </>
  );
};

type CreateFolderActionProps = {
  prefix: string;
};

const CreateFolderAction = ({ prefix }: CreateFolderActionProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { bucketName } = useBucketContext();
  const queryClient = useQueryClient();

  const form = useForm<CreateFolderSchema>({
    resolver: zodResolver(createFolderSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (isOpen) form.setFocus("name");
  }, [isOpen]);

  const createFolder = usePutObject(bucketName, {
    onSuccess: () => {
      toast.success("Folder created!");
      queryClient.invalidateQueries({ queryKey: ["browse", bucketName] });
      onClose();
      form.reset();
    },
    onError: handleError,
  });

  const onSubmit = form.handleSubmit((values) => {
    createFolder.mutate({ key: `${prefix}${values.name}/`, file: null });
  });

  return (
    <>
      <Button
        icon={FolderPlus}
        color="ghost"
        onClick={onOpen}
        title="Create Folder"
      />

      <Modal open={isOpen}>
        <Modal.Header>Create Folder</Modal.Header>

        <Modal.Body>
          <form onSubmit={onSubmit}>
            <InputField form={form} name="name" title="Name" />
          </form>
        </Modal.Body>

        <Modal.Actions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            color="primary"
            onClick={onSubmit}
            disabled={createFolder.isPending}
          >
            Submit
          </Button>
        </Modal.Actions>
      </Modal>
    </>
  );
};

export default Actions;
