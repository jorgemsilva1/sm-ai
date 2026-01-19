"use client";

import { useActionState, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  createReferenceGroup,
  createReferenceItem,
  moveReferenceItem,
  createReferenceItemComment,
  updateReferenceGroupName,
  deleteReferenceGroup,
  updateReferenceItemTitle,
  deleteReferenceItem,
} from "@/app/(app)/dashboard/clients/actions";
import { SubmitButton } from "@/components/form/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { copy, Locale } from "@/lib/i18n";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  Image,
  Link2,
  List,
  Grid2X2,
  Video,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ReferenceGroup = {
  id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
};

type ReferenceItem = {
  id: string;
  group_id: string;
  owner_id: string;
  type: string;
  title: string;
  url: string | null;
  notes: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

type ReferenceItemComment = {
  id: string;
  item_id: string;
  owner_id: string;
  body: string;
  created_at: string;
};

type ClientReferencesProps = {
  clientId: string;
  locale: Locale;
  groups: ReferenceGroup[];
  items: ReferenceItem[];
  comments: ReferenceItemComment[];
};

const TYPE_ICONS: Record<string, JSX.Element> = {
  image: <Image className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  link: <Link2 className="h-4 w-4" />,
};

const STORAGE_BUCKET = "reference-assets";

export function ClientReferences({
  clientId,
  locale,
  groups,
  items,
  comments,
}: ClientReferencesProps) {
  const t = copy[locale];
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    kind: "folder" | "item";
    id: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [thumbnailing, setThumbnailing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [typeValue, setTypeValue] = useState("link");
  const [urlValue, setUrlValue] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [moveItemId, setMoveItemId] = useState<string | null>(null);
  const [moveQuery, setMoveQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_desc");
  const [groupState, groupAction] = useActionState(
    createReferenceGroup.bind(null, clientId),
    {}
  );
  const [itemState, itemAction] = useActionState(
    createReferenceItem.bind(null, clientId, currentFolderId ?? ""),
    {}
  );
  const [commentState, commentAction] = useActionState(
    createReferenceItemComment.bind(null, clientId),
    {}
  );
  const [isPending, startTransition] = useTransition();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      groups.forEach((group) => next.add(group.id));
      return next;
    });
  }, [groups]);

  useEffect(() => {
    if (itemState?.success) {
      setShowItemForm(false);
    }
  }, [itemState?.success]);

  const groupMap = useMemo(() => {
    return groups.reduce<Record<string, ReferenceGroup>>((acc, group) => {
      acc[group.id] = group;
      return acc;
    }, {});
  }, [groups]);

  const childrenByParent = useMemo(() => {
    return groups.reduce<Record<string, ReferenceGroup[]>>((acc, group) => {
      const key = group.parent_id ?? "root";
      acc[key] = acc[key] || [];
      acc[key].push(group);
      return acc;
    }, {});
  }, [groups]);

  const itemsByGroup = useMemo(() => {
    return items.reduce<Record<string, ReferenceItem[]>>((acc, item) => {
      acc[item.group_id] = acc[item.group_id] || [];
      acc[item.group_id].push(item);
      return acc;
    }, {});
  }, [items]);

  const commentsByItem = useMemo(() => {
    return comments.reduce<Record<string, ReferenceItemComment[]>>((acc, comment) => {
      acc[comment.item_id] = acc[comment.item_id] || [];
      acc[comment.item_id].push(comment);
      return acc;
    }, {});
  }, [comments]);

  const currentItems = currentFolderId ? itemsByGroup[currentFolderId] ?? [] : [];
  const currentFolders = childrenByParent[currentFolderId ?? "root"] ?? [];
  const visibleItems = useMemo(() => {
    let filtered = currentItems;
    if (filterType !== "all") {
      filtered = filtered.filter((item) => item.type === filterType);
    }
    return [...filtered].sort((a, b) => {
      if (sortBy === "created_asc") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "created_desc") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "title_asc") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "title_desc") {
        return b.title.localeCompare(a.title);
      }
      return 0;
    });
  }, [currentItems, filterType, sortBy]);

  const breadcrumbs = useMemo(() => {
    if (!currentFolderId) return [];
    const path: ReferenceGroup[] = [];
    let node = groupMap[currentFolderId];
    while (node) {
      path.unshift(node);
      node = node.parent_id ? groupMap[node.parent_id] : undefined;
    }
    return path;
  }, [currentFolderId, groupMap]);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError(null);
    const ext = file.name.split(".").pop() || "file";
    const path = `${clientId}/${currentFolderId ?? "root"}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: true });

    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    setUrlValue(data.publicUrl);
    if (file.type.startsWith("image/")) {
      setTypeValue("image");
      setThumbnailUrl(data.publicUrl);
    } else if (file.type.startsWith("video/")) {
      setTypeValue("video");
      const thumb = await generateVideoThumbnail(file);
      if (thumb) setThumbnailUrl(thumb);
    }
    setUploading(false);
  }, [clientId, currentFolderId, supabase]);

  useEffect(() => {
    const handleDragEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
      setDragActive(true);
      setShowItemForm(true);
    };

    const handleDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
    };

    const handleDrop = (event: DragEvent) => {
      if (!event.dataTransfer?.files?.length) return;
      event.preventDefault();
      setDragActive(false);
      setShowItemForm(true);
      const file = event.dataTransfer.files[0];
      if (file) void handleUpload(file);
    };

    const handleDragLeave = (event: DragEvent) => {
      if (event.relatedTarget) return;
      setDragActive(false);
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragleave", handleDragLeave);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("dragleave", handleDragLeave);
    };
  }, [handleUpload]);

  async function generateVideoThumbnail(file: File) {
    setThumbnailing(true);
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    await new Promise((resolve) => {
      video.addEventListener("loadeddata", resolve, { once: true });
    });
    video.currentTime = Math.min(1, video.duration / 2);
    await new Promise((resolve) => {
      video.addEventListener("seeked", resolve, { once: true });
    });
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setThumbnailing(false);
      return null;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8)
    );
    if (!blob) {
      setThumbnailing(false);
      return null;
    }
    const thumbPath = `${clientId}/${currentFolderId ?? "root"}/thumb-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(thumbPath, blob, { upsert: true, contentType: "image/jpeg" });
    if (error) {
      setThumbnailing(false);
      return null;
    }
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(thumbPath);
    setThumbnailing(false);
    return data.publicUrl;
  }

  function handleDropToFolder(folderId: string) {
    if (!draggingItem) return;
    startTransition(async () => {
      await moveReferenceItem(clientId, draggingItem, folderId);
      setDraggingItem(null);
      setDropActive(null);
    });
  }

  const folderById = (id: string) => groupMap[id];
  const itemById = (id: string) => items.find((item) => item.id === id);
  const selectedItem = selectedItemId ? itemById(selectedItemId) : null;
  const selectedComments = selectedItemId ? commentsByItem[selectedItemId] ?? [] : [];
  const moveItem = moveItemId ? itemById(moveItemId) : null;

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleString(locale === "pt" ? "pt-PT" : "en-US");
  };

  async function handleRenameFolder(folderId: string) {
    const folder = folderById(folderId);
    if (!folder) return;
    const nextName = window.prompt(t.clients.sections.referencesActions.rename, folder.name);
    if (!nextName || nextName === folder.name) return;
    startTransition(async () => {
      await updateReferenceGroupName(clientId, folderId, nextName.trim());
    });
  }

  async function handleDeleteFolder(folderId: string) {
    const folder = folderById(folderId);
    if (!folder) return;
    const confirmDelete = window.confirm(
      `${t.clients.sections.referencesActions.delete}: ${folder.name}`
    );
    if (!confirmDelete) return;
    startTransition(async () => {
      await deleteReferenceGroup(clientId, folderId);
    });
  }

  async function handleRenameItem(itemId: string) {
    const item = itemById(itemId);
    if (!item) return;
    const nextTitle = window.prompt(t.clients.sections.referencesActions.rename, item.title);
    if (!nextTitle || nextTitle === item.title) return;
    startTransition(async () => {
      await updateReferenceItemTitle(clientId, itemId, nextTitle.trim());
    });
  }

  async function handleDeleteItem(itemId: string) {
    const item = itemById(itemId);
    if (!item) return;
    const confirmDelete = window.confirm(
      `${t.clients.sections.referencesActions.delete}: ${item.title}`
    );
    if (!confirmDelete) return;
    startTransition(async () => {
      await deleteReferenceItem(clientId, itemId);
    });
  }

  async function handleCopyLink(itemId: string) {
    const item = itemById(itemId);
    if (!item?.url) return;
    await navigator.clipboard.writeText(item.url);
  }

  function handleMoveItem(itemId: string) {
    setMoveItemId(itemId);
    setMoveQuery("");
    setShowMovePicker(true);
  }

  function handleMoveToFolder(targetId: string) {
    if (!moveItemId) return;
    startTransition(async () => {
      await moveReferenceItem(clientId, moveItemId, targetId);
      setShowMovePicker(false);
      setMoveItemId(null);
      setMoveQuery("");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-md border border-border/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t.clients.sections.referencesGroupsTitle}
        </p>
        <div className="mt-3 space-y-1 text-sm">
          <button
            type="button"
            onClick={() => setCurrentFolderId(null)}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left ${
              !currentFolderId ? "bg-muted/60 text-foreground" : "text-muted-foreground"
            }`}
          >
            <Folder className="h-4 w-4" />
            Root
          </button>
          {renderFolderTree(
            childrenByParent,
            "root",
            currentFolderId,
            setCurrentFolderId,
            expandedFolders,
            setExpandedFolders
          )}
        </div>
      </aside>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t.clients.sections.referencesTitle}</h2>
            <p className="text-sm text-muted-foreground">{t.clients.sections.referencesBody}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-border/40 p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-brand text-primary-foreground" : ""}
                title={t.clients.sections.referencesViewGrid}
              >
                <Grid2X2 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-brand text-primary-foreground" : ""}
                title={t.clients.sections.referencesViewList}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">
                {t.clients.sections.referencesFilterLabel}
              </Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.clients.sections.referencesFilterAll}</SelectItem>
                  <SelectItem value="image">{t.clients.sections.referencesTypes.image}</SelectItem>
                  <SelectItem value="video">{t.clients.sections.referencesTypes.video}</SelectItem>
                  <SelectItem value="link">{t.clients.sections.referencesTypes.link}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">
                {t.clients.sections.referencesSortLabel}
              </Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_desc">{t.clients.sections.referencesSortNewest}</SelectItem>
                  <SelectItem value="created_asc">{t.clients.sections.referencesSortOldest}</SelectItem>
                  <SelectItem value="title_asc">{t.clients.sections.referencesSortAZ}</SelectItem>
                  <SelectItem value="title_desc">{t.clients.sections.referencesSortZA}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="bg-brand text-primary-foreground"
              onClick={() => setShowGroupForm((prev) => !prev)}
            >
              {t.clients.sections.referencesGroupCreate}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowItemForm(true)}
              disabled={!currentFolderId}
            >
              {t.clients.sections.referencesActions.addItem}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <button type="button" onClick={() => setCurrentFolderId(null)}>
            Root
          </button>
          {breadcrumbs.map((crumb) => (
            <button
              key={crumb.id}
              type="button"
              onClick={() => setCurrentFolderId(crumb.id)}
            >
              / {crumb.name}
            </button>
          ))}
        </div>

        {showGroupForm ? (
          <div className="rounded-md border border-border/40 p-4">
            {groupState?.error ? (
              <Alert variant="destructive">
                <AlertTitle>{t.common.errorTitle}</AlertTitle>
                <AlertDescription>{groupState.error}</AlertDescription>
              </Alert>
            ) : null}
            {groupState?.success ? (
              <Alert>
                <AlertTitle>{t.common.updatedTitle}</AlertTitle>
                <AlertDescription>{groupState.success}</AlertDescription>
              </Alert>
            ) : null}

            <form action={groupAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="parent_id" value={currentFolderId ?? ""} />
              <div className="space-y-2">
                <Label htmlFor="group-name">{t.clients.sections.referencesFields.groupName}</Label>
                <Input id="group-name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-description">
                  {t.clients.sections.referencesFields.groupDescription}
                </Label>
                <Input id="group-description" name="description" />
              </div>
              <div className="md:col-span-2">
                <SubmitButton className="bg-brand text-primary-foreground">
                  {t.clients.sections.referencesActions.createGroup}
                </SubmitButton>
              </div>
            </form>
          </div>
        ) : null}

        {showItemForm ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
            onClick={() => setShowItemForm(false)}
          >
            <div
              className="w-full max-w-xl rounded-md border border-border/40 bg-background p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    {t.clients.sections.referencesAddTitle}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t.clients.sections.referencesAddBody}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowItemForm(false)}>
                  {t.common.close}
                </Button>
              </div>
              {!currentFolderId ? (
                <Alert className="mt-4">
                  <AlertTitle>{t.common.errorTitle}</AlertTitle>
                  <AlertDescription>{t.clients.sections.referencesFolderRequired}</AlertDescription>
                </Alert>
              ) : null}
              {itemState?.error ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>{t.common.errorTitle}</AlertTitle>
                  <AlertDescription>{itemState.error}</AlertDescription>
                </Alert>
              ) : null}
              {uploadError ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>{t.common.errorTitle}</AlertTitle>
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              ) : null}
              {itemState?.success ? (
                <Alert className="mt-4">
                  <AlertTitle>{t.common.updatedTitle}</AlertTitle>
                  <AlertDescription>{itemState.success}</AlertDescription>
                </Alert>
              ) : null}

              <div
                className={`mt-4 rounded-md border border-dashed p-4 text-center text-sm ${
                  dragActive ? "border-brand bg-brand/10" : "border-border/60"
                }`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (file) void handleUpload(file);
                }}
              >
                <p className="font-medium">{t.clients.sections.referencesDropTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.clients.sections.referencesDropBody}
                </p>
              </div>

              <form action={itemAction} className="mt-4 grid gap-4 md:grid-cols-2">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="thumbnail_url" value={thumbnailUrl} />
                <div className="space-y-2">
                  <Label htmlFor="item-title">{t.clients.sections.referencesFields.itemTitle}</Label>
                  <Input id="item-title" name="title" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-type">{t.clients.sections.referencesFields.itemType}</Label>
                  <input type="hidden" name="type" value={typeValue} />
                  <Select value={typeValue} onValueChange={setTypeValue}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">{t.clients.sections.referencesTypes.image}</SelectItem>
                      <SelectItem value="video">{t.clients.sections.referencesTypes.video}</SelectItem>
                      <SelectItem value="link">{t.clients.sections.referencesTypes.link}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {typeValue === "link" ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="item-url">{t.clients.sections.referencesFields.itemUrl}</Label>
                    <Input
                      id="item-url"
                      name="url"
                      value={urlValue}
                      onChange={(event) => setUrlValue(event.target.value)}
                      placeholder="https://"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 md:col-span-2">
                    <input type="hidden" name="url" value={urlValue} />
                    <Label htmlFor="item-file">
                      {t.clients.sections.referencesTypes.image} /{" "}
                      {t.clients.sections.referencesTypes.video}
                    </Label>
                    <input
                      id="item-file"
                      type="file"
                      accept={typeValue === "image" ? "image/*" : "video/*"}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleUpload(file);
                      }}
                      className="block w-full text-sm text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">
                      {uploading
                        ? t.clients.sections.referencesUploadUploading
                        : thumbnailing
                        ? t.clients.sections.referencesUploadThumbnail
                        : t.clients.sections.referencesUploadHint}
                    </p>
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={t.clients.sections.referencesFields.itemTitle}
                        className="h-32 w-full rounded-md object-cover"
                      />
                    ) : null}
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="item-notes">{t.clients.sections.referencesFields.itemNotes}</Label>
                  <Textarea id="item-notes" name="notes" rows={2} />
                </div>
                <div className="md:col-span-2">
                  <SubmitButton className="bg-brand text-primary-foreground">
                    {t.clients.sections.referencesActions.saveItem}
                  </SubmitButton>
                </div>
              </form>
            </div>
          </div>
        ) : null}
        {showMovePicker ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
            onClick={() => setShowMovePicker(false)}
          >
            <div
              className="w-full max-w-lg rounded-md border border-border/40 bg-background p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    {t.clients.sections.referencesMoveTitle}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t.clients.sections.referencesMoveBody}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowMovePicker(false)}>
                  {t.common.close}
                </Button>
              </div>
              <div className="mt-4">
                <Input
                  value={moveQuery}
                  onChange={(event) => setMoveQuery(event.target.value)}
                  placeholder={t.clients.sections.referencesMoveSearch}
                />
              </div>
              <div className="mt-4 max-h-80 overflow-auto rounded-md border border-border/40 p-2">
                {renderMoveTree({
                  childrenByParent,
                  groupMap,
                  currentId: moveItem?.group_id ?? null,
                  query: moveQuery,
                  emptyLabel: t.clients.sections.referencesMoveEmpty,
                  onSelect: handleMoveToFolder,
                })}
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setCurrentFolderId(folder.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setContextMenu({
                    x: event.clientX,
                    y: event.clientY,
                    kind: "folder",
                    id: folder.id,
                  });
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragEnter={() => setDropActive(folder.id)}
                onDragLeave={() => setDropActive(null)}
                onDrop={() => handleDropToFolder(folder.id)}
                className={`flex items-center gap-3 rounded-md border border-border/40 bg-background/60 p-3 text-left ${
                  dropActive === folder.id ? "border-brand/60 bg-muted/30" : ""
                }`}
              >
                <Folder className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{folder.name}</p>
                  {folder.description ? (
                    <p className="text-xs text-muted-foreground">{folder.description}</p>
                  ) : null}
                </div>
              </button>
            ))}
          </div>

          {!currentFolderId ? (
            <div className="rounded-md border border-border/40 p-4 text-sm text-muted-foreground">
              {t.clients.sections.referencesEmpty}
            </div>
          ) : visibleItems.length ? (
            viewMode === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleItems.map((item) => (
                  <div
                    key={item.id}
                    className="relative rounded-md border border-border/40 bg-background/60 p-2"
                    draggable
                    onClick={() => setSelectedItemId(item.id)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setContextMenu({
                        x: event.clientX,
                        y: event.clientY,
                        kind: "item",
                        id: item.id,
                      });
                    }}
                    onDragStart={(event) => {
                      setDraggingItem(item.id);
                      event.dataTransfer.setData("text/reference-item", item.id);
                    }}
                  >
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="h-44 w-full rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-44 w-full items-center justify-center rounded-md border border-dashed border-border/60 text-muted-foreground">
                        {TYPE_ICONS[item.type] ?? TYPE_ICONS.link}
                      </div>
                    )}
                    {item.url ? (
                      <a
                        href={item.url}
                        className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-foreground"
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Link2 className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-border/40">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="w-16 px-3 py-2 text-left"></th>
                      <th className="px-3 py-2 text-left">
                        {t.clients.sections.referencesFields.itemTitle}
                      </th>
                      <th className="px-3 py-2 text-left">
                        {t.clients.sections.referencesFields.itemType}
                      </th>
                      <th className="px-3 py-2 text-left">
                        {t.clients.sections.referencesMetadataUpdated}
                      </th>
                      <th className="w-16 px-3 py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-border/30 hover:bg-muted/30"
                        draggable
                        onClick={() => setSelectedItemId(item.id)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setContextMenu({
                            x: event.clientX,
                            y: event.clientY,
                            kind: "item",
                            id: item.id,
                          });
                        }}
                        onDragStart={(event) => {
                          setDraggingItem(item.id);
                          event.dataTransfer.setData("text/reference-item", item.id);
                        }}
                      >
                        <td className="px-3 py-2">
                          {item.thumbnail_url ? (
                            <img
                              src={item.thumbnail_url}
                              alt={item.title}
                              className="h-10 w-14 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-14 items-center justify-center rounded-md border border-dashed border-border/60 text-muted-foreground">
                              {TYPE_ICONS[item.type] ?? TYPE_ICONS.link}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium">{item.title}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {t.clients.sections.referencesTypes[
                            item.type as keyof typeof t.clients.sections.referencesTypes
                          ] ?? t.clients.sections.referencesTypes.link}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDate(item.updated_at)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {item.url ? (
                            <a
                              href={item.url}
                              className="inline-flex rounded-full bg-background/80 p-1 text-muted-foreground hover:text-foreground"
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Link2 className="h-4 w-4" />
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="rounded-md border border-border/40 p-4 text-sm text-muted-foreground">
              {t.clients.sections.referencesEmpty}
            </div>
          )}
        </div>
        {selectedItem ? (
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-border/40 bg-background/95 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{selectedItem.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {t.clients.sections.referencesTypes[
                    selectedItem.type as keyof typeof t.clients.sections.referencesTypes
                  ] ?? t.clients.sections.referencesTypes.link}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedItemId(null)}>
                {t.common.close}
              </Button>
            </div>
            <div className="mt-4 space-y-6">
              {selectedItem.thumbnail_url ? (
                <img
                  src={selectedItem.thumbnail_url}
                  alt={selectedItem.title}
                  className="h-56 w-full rounded-md object-cover"
                />
              ) : null}
              {selectedItem.url ? (
                <div className="space-y-1">
                  <Label>{t.clients.sections.referencesFields.itemUrl}</Label>
                  <a
                    href={selectedItem.url}
                    className="text-sm text-brand hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selectedItem.url}
                  </a>
                </div>
              ) : null}
              {selectedItem.notes ? (
                <div className="space-y-1">
                  <Label>{t.clients.sections.referencesFields.itemNotes}</Label>
                  <p className="text-sm text-muted-foreground">{selectedItem.notes}</p>
                </div>
              ) : null}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.clients.sections.referencesMetadataTitle}
                </p>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t.clients.sections.referencesMetadataType}
                    </span>
                    <span>
                      {t.clients.sections.referencesTypes[
                        selectedItem.type as keyof typeof t.clients.sections.referencesTypes
                      ] ?? t.clients.sections.referencesTypes.link}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t.clients.sections.referencesMetadataFolder}
                    </span>
                    <span>{groupMap[selectedItem.group_id]?.name ?? "-"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t.clients.sections.referencesMetadataUploader}
                    </span>
                    <span>{selectedItem.owner_id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t.clients.sections.referencesMetadataCreated}
                    </span>
                    <span>{formatDate(selectedItem.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t.clients.sections.referencesMetadataUpdated}
                    </span>
                    <span>{formatDate(selectedItem.updated_at)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.clients.sections.referencesCommentsTitle}
                </p>
                {commentState?.error ? (
                  <Alert variant="destructive">
                    <AlertTitle>{t.common.errorTitle}</AlertTitle>
                    <AlertDescription>{commentState.error}</AlertDescription>
                  </Alert>
                ) : null}
                {commentState?.success ? (
                  <Alert>
                    <AlertTitle>{t.common.successTitle}</AlertTitle>
                    <AlertDescription>{commentState.success}</AlertDescription>
                  </Alert>
                ) : null}
                <form action={commentAction} className="space-y-2">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="item_id" value={selectedItem.id} />
                  <Textarea
                    name="comment"
                    rows={3}
                    placeholder={t.clients.sections.referencesCommentPlaceholder}
                    required
                  />
                  <SubmitButton className="bg-brand text-primary-foreground">
                    {t.clients.sections.referencesActions.addComment}
                  </SubmitButton>
                </form>
                {selectedComments.length ? (
                  <div className="space-y-3">
                    {selectedComments.map((comment) => (
                      <div key={comment.id} className="rounded-md border border-border/40 p-3">
                        <p className="text-sm">{comment.body}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {comment.owner_id} · {formatDate(comment.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t.clients.sections.referencesCommentsEmpty}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
        {contextMenu ? (
          <div
            className="fixed inset-0 z-50"
            onClick={() => setContextMenu(null)}
          >
            <div
              className="absolute min-w-[180px] rounded-md border border-border/40 bg-popover p-2 text-sm shadow-lg"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={(event) => event.stopPropagation()}
            >
              {contextMenu.kind === "folder" ? (
                <div className="space-y-1">
                  <button
                    className="w-full rounded-md px-2 py-1 text-left hover:bg-muted/60"
                    onClick={() => {
                      setCurrentFolderId(contextMenu.id);
                      setContextMenu(null);
                    }}
                  >
                    {t.clients.sections.referencesActions.open}
                  </button>
                  <button
                    className="w-full rounded-md px-2 py-1 text-left hover:bg-muted/60"
                    onClick={() => {
                      setCurrentFolderId(contextMenu.id);
                      setShowGroupForm(true);
                      setContextMenu(null);
                    }}
                  >
                    {t.clients.sections.referencesActions.newFolderInside}
                  </button>
                  <button
                    className="w-full rounded-md px-2 py-1 text-left hover:bg-muted/60"
                    onClick={() => {
                      void handleRenameFolder(contextMenu.id);
                      setContextMenu(null);
                    }}
                  >
                    {t.clients.sections.referencesActions.rename}
                  </button>
                  <button
                    className="w-full rounded-md px-2 py-1 text-left text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      void handleDeleteFolder(contextMenu.id);
                      setContextMenu(null);
                    }}
                  >
                    {t.clients.sections.referencesActions.delete}
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <button
                    className="w-full rounded-md px-2 py-1 text-left hover:bg-muted/60"
                    onClick={() => {
                      const item = itemById(contextMenu.id);
                      if (item?.url) window.open(item.url, "_blank");
                      setContextMenu(null);
                    }}
                  >
                    {t.clients.sections.referencesActions.open}
                  </button>
                  <button
                    className="w-full rounded-md px-2 py-1 text-left hover:bg-muted/60"
                    onClick={() => {
                      void handleCopyLink(contextMenu.id);
                      setContextMenu(null);
                    }}
                  >
                    {t.clients.sections.referencesActions.copyLink}
                  </button>
                  <button
                    className="w-full rounded-md px-2 py-1 text-left hover:bg-muted/60"
                    onClick={() => {
                      void handleMoveItem(contextMenu.id);
                      setContextMenu(null);
                    }}
                  >
                    {t.clients.sections.referencesActions.move}
                  </button>
                  <button
                    className="w-full rounded-md px-2 py-1 text-left hover:bg-muted/60"
                    onClick={() => {
                      void handleRenameItem(contextMenu.id);
                      setContextMenu(null);
                    }}
                  >
                    {t.clients.sections.referencesActions.rename}
                  </button>
                  <button
                    className="w-full rounded-md px-2 py-1 text-left text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      void handleDeleteItem(contextMenu.id);
                      setContextMenu(null);
                    }}
                  >
                    {t.clients.sections.referencesActions.delete}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function renderFolderTree(
  childrenByParent: Record<string, ReferenceGroup[]>,
  parentId: string,
  currentId: string | null,
  onSelect: (id: string) => void,
  expandedFolders: Set<string>,
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>,
  depth = 0
) {
  const children = childrenByParent[parentId] ?? [];
  return children.map((child) => (
    <div key={child.id} className="space-y-1">
      <div
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left ${
          currentId === child.id ? "bg-muted/60 text-foreground" : "text-muted-foreground"
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {childrenByParent[child.id]?.length ? (
          <button
            type="button"
            onClick={() =>
              setExpandedFolders((prev) => {
                const next = new Set(prev);
                if (next.has(child.id)) next.delete(child.id);
                else next.add(child.id);
                return next;
              })
            }
            className="text-muted-foreground hover:text-foreground"
            aria-label="Toggle folder"
          >
            {expandedFolders.has(child.id) ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="inline-flex h-3.5 w-3.5" />
        )}
        <button type="button" onClick={() => onSelect(child.id)} className="flex items-center gap-2">
          <Folder className="h-4 w-4" />
          {child.name}
        </button>
      </div>
      {expandedFolders.has(child.id)
        ? renderFolderTree(
            childrenByParent,
            child.id,
            currentId,
            onSelect,
            expandedFolders,
            setExpandedFolders,
            depth + 1
          )
        : null}
    </div>
  ));
}

function renderMoveTree({
  childrenByParent,
  groupMap,
  currentId,
  query,
  emptyLabel,
  onSelect,
}: {
  childrenByParent: Record<string, ReferenceGroup[]>;
  groupMap: Record<string, ReferenceGroup>;
  currentId: string | null;
  query: string;
  emptyLabel: string;
  onSelect: (id: string) => void;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  const buildPath = (id: string) => {
    const parts: string[] = [];
    let node = groupMap[id];
    while (node) {
      parts.unshift(node.name);
      node = node.parent_id ? groupMap[node.parent_id] : undefined;
    }
    return parts.join(" / ");
  };

  if (normalizedQuery) {
    const matches = Object.values(groupMap)
      .map((group) => ({
        id: group.id,
        name: group.name,
        path: buildPath(group.id),
      }))
      .filter((entry) => entry.path.toLowerCase().includes(normalizedQuery));

    if (!matches.length) {
      return (
        <p className="px-2 py-3 text-sm text-muted-foreground">{emptyLabel}</p>
      );
    }

    return (
      <div className="space-y-1">
        {matches.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry.id)}
            disabled={entry.id === currentId}
            className={`w-full rounded-md px-2 py-1 text-left text-sm hover:bg-muted/60 ${
              entry.id === currentId ? "cursor-not-allowed text-muted-foreground" : ""
            }`}
          >
            {entry.path}
          </button>
        ))}
      </div>
    );
  }

  const renderTree = (parentId: string, depth = 0) => {
    const children = childrenByParent[parentId] ?? [];
    return children.map((child) => (
      <div key={child.id} className="space-y-1">
        <button
          type="button"
          onClick={() => onSelect(child.id)}
          disabled={child.id === currentId}
          className={`w-full rounded-md px-2 py-1 text-left text-sm hover:bg-muted/60 ${
            child.id === currentId ? "cursor-not-allowed text-muted-foreground" : ""
          }`}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          {child.name}
        </button>
        {renderTree(child.id, depth + 1)}
      </div>
    ));
  };

  return <div className="space-y-1">{renderTree("root")}</div>;
}
