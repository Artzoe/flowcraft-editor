"use client";

import { useEffect, useRef, useState } from "react";
import {
  App,
  Button,
  ColorPicker,
  ConfigProvider,
  Divider,
  Dropdown,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import type { MenuProps } from "antd";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Download,
  Ellipsis,
  Eye,
  FileText,
  History,
  Layers3,
  LockKeyhole,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Share2,
  Sparkles,
  Tags,
  Trash2,
  UploadCloud,
  Users,
} from "lucide-react";
import { toPng } from "html-to-image";

type ThemeColor = { name: string; color: string; soft: string };
type Label = { id: string; name: string; color: string };
type Attachment = { id: string; name: string; type: string; size: number; dataUrl: string };
type NodeItem = { id: string; labelIds?: string[]; tagIds?: string[]; title: string; subtitle?: string; detail?: string; attachments?: Attachment[] };
type ColumnItem = { id: string; title: string; subtitle?: string; theme: string; nodes: NodeItem[] };
type FlowMeta = { title: string; subtitle?: string };
type VersionSnapshot = {
  id: string;
  version: string;
  createdAt: string;
  meta: FlowMeta;
  columns: ColumnItem[];
  labels: Label[];
  tags?: Label[];
};
type FlowDocument = {
  id: string;
  createdAt: string;
  meta: FlowMeta;
  columns: ColumnItem[];
  labels: Label[];
  tags?: Label[];
  versions: VersionSnapshot[];
  currentVersion: string;
};

const themes: ThemeColor[] = [
  { name: "曜石蓝", color: "#2F54EB", soft: "#EEF2FF" },
  { name: "湖水青", color: "#08979C", soft: "#E6FFFB" },
  { name: "松石绿", color: "#389E0D", soft: "#F6FFED" },
  { name: "琥珀橙", color: "#D46B08", soft: "#FFF7E6" },
  { name: "珊瑚红", color: "#CF3F4F", soft: "#FFF1F0" },
  { name: "葡萄紫", color: "#722ED1", soft: "#F9F0FF" },
  { name: "玫瑰粉", color: "#C41D7F", soft: "#FFF0F6" },
];

const initialLabels: Label[] = [
  { id: "tag-1", name: "关键节点", color: "#2F54EB" },
  { id: "tag-2", name: "自动化", color: "#722ED1" },
  { id: "tag-3", name: "人工确认", color: "#D46B08" },
  { id: "tag-4", name: "已完成", color: "#389E0D" },
];

const initialColumns: ColumnItem[] = [
  {
    id: "col-1",
    title: "需求洞察",
    subtitle: "定义问题与成功标准",
    theme: themes[0].color,
    nodes: [
      { id: "node-1", labelIds: ["tag-1", "tag-3"], title: "用户访谈", subtitle: "收集真实场景与核心痛点" },
      { id: "node-2", labelIds: ["tag-3"], title: "需求归类", subtitle: "按优先级整理需求池" },
    ],
  },
  {
    id: "col-2",
    title: "方案设计",
    subtitle: "形成可验证的解决方案",
    theme: themes[5].color,
    nodes: [
      { id: "node-3", labelIds: ["tag-2"], title: "流程草图", subtitle: "梳理关键路径和异常分支" },
      { id: "node-4", labelIds: ["tag-1", "tag-2"], title: "高保真原型", subtitle: "完成核心页面交互" },
      { id: "node-5", labelIds: ["tag-3"], title: "设计评审", subtitle: "确认范围、风险与交付标准" },
    ],
  },
  {
    id: "col-3",
    title: "开发交付",
    subtitle: "实现、测试并发布",
    theme: themes[1].color,
    nodes: [
      { id: "node-6", labelIds: ["tag-2"], title: "功能开发", subtitle: "按迭代计划实现功能" },
      { id: "node-7", labelIds: ["tag-3", "tag-4"], title: "验收上线", subtitle: "验证指标并持续复盘" },
    ],
  },
];

const initialMeta: FlowMeta = { title: "产品设计交付流程", subtitle: "从需求洞察到稳定上线的协作路径" };
const LEGACY_VERSION_STORAGE_KEY = "flowcraft-version-history";
const WORKSPACE_STORAGE_KEY = "flowcraft-multi-flow-workspace";
const AUTH_SESSION_KEY = "flowcraft-authenticated";
const SHARE_PREFIX = "#share=";
const MAX_FILE_SIZE = 1024 * 1024;
const MAX_SHARE_LENGTH = 1_800_000;
const EDITOR_ACCOUNT = "flowcraft";
const EDITOR_PASSWORD_DIGEST = "0139ac6fa1fb1ec90bc15fe5eb13421f32579bce849ab697aa3ef3b77823ae17";
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};
const encodeShare = (value: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const decodeShare = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as Pick<FlowDocument, "id" | "meta" | "columns" | "labels" | "tags" | "currentVersion">;
};
const fileToAttachment = (file: File) => new Promise<Attachment>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve({ id: uid("file"), name: file.name, type: file.type || "application/octet-stream", size: file.size, dataUrl: String(reader.result) });
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});
const createFlowDocument = (meta: FlowMeta, columns: ColumnItem[], labels: Label[]): FlowDocument => {
  const version: VersionSnapshot = {
    id: uid("version"),
    version: "v1.0.0",
    createdAt: new Date().toISOString(),
    meta: clone(meta),
    columns: clone(columns),
    labels: clone(labels),
    tags: [],
  };
  return {
    id: uid("flow"),
    createdAt: new Date().toISOString(),
    meta: clone(meta),
    columns: clone(columns),
    labels: clone(labels),
    tags: [],
    versions: [version],
    currentVersion: version.version,
  };
};

function FlowEditor() {
  const { message } = App.useApp();
  const [meta, setMeta] = useState<FlowMeta>(initialMeta);
  const [columns, setColumns] = useState<ColumnItem[]>(initialColumns);
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [nodeTags, setNodeTags] = useState<Label[]>([]);
  const [metaOpen, setMetaOpen] = useState(false);
  const [columnOpen, setColumnOpen] = useState(false);
  const [nodeOpen, setNodeOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [tagLibraryOpen, setTagLibraryOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string>();
  const [versionOpen, setVersionOpen] = useState(false);
  const [newFlowOpen, setNewFlowOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [versions, setVersions] = useState<VersionSnapshot[]>([]);
  const [currentVersion, setCurrentVersion] = useState("v1.0.0");
  const [flowDocs, setFlowDocs] = useState<FlowDocument[]>([]);
  const [activeFlowId, setActiveFlowId] = useState("");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [shareMode, setShareMode] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string>();
  const [editingNode, setEditingNode] = useState<{ columnId: string; nodeId?: string }>();
  const [previewNode, setPreviewNode] = useState<{ node: NodeItem; roles: Label[]; tags: Label[] }>();
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [view, setView] = useState<"编辑视图" | "展示视图">("编辑视图");
  const [exporting, setExporting] = useState(false);
  const [metaForm] = Form.useForm();
  const [columnForm] = Form.useForm();
  const [nodeForm] = Form.useForm();
  const [tagForm] = Form.useForm();
  const [nodeTagForm] = Form.useForm();
  const [newFlowForm] = Form.useForm();
  const [loginForm] = Form.useForm();
  const watchedColumnTheme = Form.useWatch("theme", columnForm);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.location.hash.startsWith(SHARE_PREFIX)) {
      try {
        const shared = decodeShare(window.location.hash.slice(SHARE_PREFIX.length));
        const sharedDocument: FlowDocument = {
          ...shared,
          createdAt: new Date().toISOString(),
          versions: [],
        };
        setShareMode(true);
        setIsAuthenticated(false);
        setFlowDocs([sharedDocument]);
        setActiveFlowId(sharedDocument.id);
        setMeta(clone(sharedDocument.meta));
        setColumns(clone(sharedDocument.columns));
        setLabels(clone(sharedDocument.labels));
        setNodeTags(clone(sharedDocument.tags ?? []));
        setVersions([]);
        setCurrentVersion(sharedDocument.currentVersion || "分享快照");
        setView("展示视图");
        setWorkspaceReady(true);
        setAuthReady(true);
        return;
      } catch {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }

    setIsAuthenticated(window.sessionStorage.getItem(AUTH_SESSION_KEY) === "true");
    setAuthReady(true);
    let initialDocument: FlowDocument | undefined;
    let initialDocuments: FlowDocument[] = [];
    let initialActiveId = "";

    try {
      const savedWorkspace = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (savedWorkspace) {
        const parsed = JSON.parse(savedWorkspace) as { activeFlowId: string; flowDocs: FlowDocument[] };
        if (parsed.flowDocs?.length) {
          initialDocuments = parsed.flowDocs;
          initialDocument = parsed.flowDocs.find((item) => item.id === parsed.activeFlowId) ?? parsed.flowDocs[0];
          initialActiveId = initialDocument.id;
        }
      }
    } catch {
      // Continue with legacy data or a fresh workspace.
    }

    if (!initialDocument) {
      try {
        const legacy = window.localStorage.getItem(LEGACY_VERSION_STORAGE_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy) as { currentVersion: string; versions: VersionSnapshot[] };
          const active = parsed.versions.find((item) => item.version === parsed.currentVersion) ?? parsed.versions[0];
          if (active) {
            initialDocument = {
              id: uid("flow"),
              createdAt: new Date().toISOString(),
              meta: clone(active.meta),
              columns: clone(active.columns),
              labels: clone(active.labels),
              tags: clone(active.tags ?? []),
              versions: parsed.versions,
              currentVersion: active.version,
            };
            initialDocuments = [initialDocument];
            initialActiveId = initialDocument.id;
          }
        }
      } catch {
        // Strict file:// modes may block storage; a session workspace still works.
      }
    }

    if (!initialDocument) {
      initialDocument = createFlowDocument(initialMeta, initialColumns, initialLabels);
      initialDocuments = [initialDocument];
      initialActiveId = initialDocument.id;
    }

    setFlowDocs(initialDocuments);
    setActiveFlowId(initialActiveId);
    setMeta(clone(initialDocument.meta));
    setColumns(clone(initialDocument.columns));
    setLabels(clone(initialDocument.labels));
    setNodeTags(clone(initialDocument.tags ?? []));
    setVersions(clone(initialDocument.versions));
    setCurrentVersion(initialDocument.currentVersion);
    setWorkspaceReady(true);
  }, []);

  useEffect(() => {
    if (shareMode || !workspaceReady || !activeFlowId || !flowDocs.length) return;
    setFlowDocs((items) => {
      const next = items.map((item) => item.id === activeFlowId ? {
        ...item,
        meta: clone(meta),
        columns: clone(columns),
        labels: clone(labels),
        tags: clone(nodeTags),
        versions: clone(versions),
        currentVersion,
      } : item);
      try {
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({ activeFlowId, flowDocs: next }));
      } catch {
        // Keep the multi-flow workspace usable in strict offline modes.
      }
      return next;
    });
  }, [shareMode, workspaceReady, activeFlowId, meta, columns, labels, nodeTags, versions, currentVersion]);

  const editMode = isAuthenticated && !shareMode && view === "编辑视图";
  const columnTrackWidth = columns.length
    ? columns.length * 318 + Math.max(0, columns.length - 1) * 62
    : 636;
  const exportWidth = Math.max(720, columnTrackWidth + 84);
  const displayWidth = exportWidth + (editMode && columns.length ? 242 : 0);

  const login = async () => {
    try {
      const values = await loginForm.validateFields();
      const passwordDigest = await sha256(String(values.password));
      if (values.username !== EDITOR_ACCOUNT || passwordDigest !== EDITOR_PASSWORD_DIGEST) {
        message.error("账号或密码错误");
        return;
      }
      window.sessionStorage.setItem(AUTH_SESSION_KEY, "true");
      setIsAuthenticated(true);
      message.success("登录成功");
    } catch {
      // Ant Design displays field validation messages.
    }
  };

  const logout = () => {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
    setIsAuthenticated(false);
    setView("编辑视图");
  };

  const shareCurrentFlow = async () => {
    try {
      const payload = encodeShare({ id: activeFlowId, meta, columns, labels, tags: nodeTags, currentVersion });
      const link = `${window.location.origin}${window.location.pathname}${SHARE_PREFIX}${payload}`;
      if (link.length > MAX_SHARE_LENGTH) {
        message.error("附件体积过大，无法生成稳定的分享链接，请移除较大的附件后重试");
        return;
      }
      setShareLink(link);
      setShareOpen(true);
      await navigator.clipboard?.writeText(link);
      message.success("只读分享链接已复制");
    } catch {
      message.error("分享链接生成失败");
    }
  };

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    message.success("链接已复制");
  };

  const addAttachment = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      message.error(`${file.name} 超过 1MB。当前静态版为保证分享链接可用，单个文件不能超过 1MB`);
      return;
    }
    try {
      const attachment = await fileToAttachment(file);
      setPendingAttachments((items) => [...items, attachment]);
    } catch {
      message.error(`${file.name} 读取失败`);
    }
  };

  const switchFlow = (flowId: string) => {
    const document = flowDocs.find((item) => item.id === flowId);
    if (!document || document.id === activeFlowId) return;
    setActiveFlowId(document.id);
    setMeta(clone(document.meta));
    setColumns(clone(document.columns));
    setLabels(clone(document.labels));
    setNodeTags(clone(document.tags ?? []));
    setRoleFilter([]);
    setVersions(clone(document.versions));
    setCurrentVersion(document.currentVersion);
  };

  const openNewFlow = () => {
    newFlowForm.resetFields();
    setNewFlowOpen(true);
  };

  const createNewFlow = async () => {
    try {
      const values = await newFlowForm.validateFields() as FlowMeta;
      const document = createFlowDocument(values, [], initialLabels);
      setFlowDocs((items) => [...items, document]);
      setActiveFlowId(document.id);
      setMeta(clone(document.meta));
      setColumns([]);
      setLabels(clone(document.labels));
      setNodeTags([]);
      setRoleFilter([]);
      setVersions(clone(document.versions));
      setCurrentVersion(document.currentVersion);
      setNewFlowOpen(false);
      message.success("新流程已创建");
    } catch {
      // Ant Design displays field validation messages.
    }
  };

  const deleteCurrentFlow = () => {
    if (flowDocs.length <= 1) return;
    const remaining = flowDocs.filter((item) => item.id !== activeFlowId);
    const next = remaining[0];
    setFlowDocs(remaining);
    setActiveFlowId(next.id);
    setMeta(clone(next.meta));
    setColumns(clone(next.columns));
    setLabels(clone(next.labels));
    setNodeTags(clone(next.tags ?? []));
    setRoleFilter([]);
    setVersions(clone(next.versions));
    setCurrentVersion(next.currentVersion);
    message.success("流程已删除");
  };

  const saveVersion = () => {
    const highestPatch = versions.reduce((max, item) => {
      const patch = Number(item.version.split(".").at(-1));
      return Number.isFinite(patch) ? Math.max(max, patch) : max;
    }, 0);
    const nextVersion = `v1.0.${highestPatch + 1}`;
    const snapshot: VersionSnapshot = {
      id: uid("version"),
      version: nextVersion,
      createdAt: new Date().toISOString(),
      meta: clone(meta),
      columns: clone(columns),
      labels: clone(labels),
      tags: clone(nodeTags),
    };
    setVersions((items) => [snapshot, ...items]);
    setCurrentVersion(nextVersion);
    message.success(`${nextVersion} 已保存`);
  };

  const restoreVersion = (snapshot: VersionSnapshot) => {
    setMeta(clone(snapshot.meta));
    setColumns(clone(snapshot.columns));
    setLabels(clone(snapshot.labels));
    setNodeTags(clone(snapshot.tags ?? []));
    setRoleFilter([]);
    setCurrentVersion(snapshot.version);
    setVersionOpen(false);
    message.success(`已回档到 ${snapshot.version}`);
  };

  const openMeta = () => {
    metaForm.setFieldsValue(meta);
    setMetaOpen(true);
  };

  const saveMeta = async () => {
    const values = await metaForm.validateFields();
    setMeta(values);
    setMetaOpen(false);
    message.success("流程信息已更新");
  };

  const openColumn = (column?: ColumnItem) => {
    setEditingColumnId(column?.id);
    columnForm.setFieldsValue({
      title: column?.title,
      subtitle: column?.subtitle,
      theme: column?.theme ?? themes[columns.length % themes.length].color,
    });
    setColumnOpen(true);
  };

  const saveColumn = async () => {
    const values = await columnForm.validateFields();
    if (editingColumnId) {
      setColumns((items) => items.map((item) => item.id === editingColumnId ? { ...item, ...values } : item));
      message.success("流程列已更新");
    } else {
      setColumns((items) => [...items, { id: uid("col"), ...values, nodes: [] }]);
      message.success("流程列已添加");
    }
    setColumnOpen(false);
  };

  const deleteColumn = (columnId: string) => {
    setColumns((items) => items.filter((item) => item.id !== columnId));
    message.success("流程列已删除");
  };

  const moveColumn = (columnId: string, direction: -1 | 1) => {
    setColumns((items) => {
      const index = items.findIndex((item) => item.id === columnId);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= items.length) return items;
      const clone = [...items];
      [clone[index], clone[next]] = [clone[next], clone[index]];
      return clone;
    });
  };

  const openNode = (columnId: string, node?: NodeItem) => {
    setEditingNode({ columnId, nodeId: node?.id });
    nodeForm.setFieldsValue({ tagIds: node?.tagIds ?? [], labelIds: node?.labelIds ?? [], title: node?.title, subtitle: node?.subtitle, detail: node?.detail });
    setPendingAttachments(clone(node?.attachments ?? []));
    setNodeOpen(true);
  };

  const saveNode = async () => {
    const values = { ...(await nodeForm.validateFields()), attachments: clone(pendingAttachments) };
    if (!editingNode) return;
    setColumns((items) => items.map((column) => {
      if (column.id !== editingNode.columnId) return column;
      if (editingNode.nodeId) {
        return { ...column, nodes: column.nodes.map((node) => node.id === editingNode.nodeId ? { ...node, ...values } : node) };
      }
      return { ...column, nodes: [...column.nodes, { id: uid("node"), ...values }] };
    }));
    setNodeOpen(false);
    message.success(editingNode.nodeId ? "子节点已更新" : "子节点已添加");
  };

  const deleteNode = (columnId: string, nodeId: string) => {
    setColumns((items) => items.map((column) => column.id === columnId ? { ...column, nodes: column.nodes.filter((node) => node.id !== nodeId) } : column));
    message.success("子节点已删除");
  };

  const moveNode = (columnId: string, nodeId: string, direction: -1 | 1) => {
    setColumns((items) => items.map((column) => {
      if (column.id !== columnId) return column;
      const index = column.nodes.findIndex((node) => node.id === nodeId);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= column.nodes.length) return column;
      const nodes = [...column.nodes];
      [nodes[index], nodes[next]] = [nodes[next], nodes[index]];
      return { ...column, nodes };
    }));
  };

  const addLabel = async () => {
    const values = await tagForm.validateFields();
    setLabels((items) => [...items, { id: uid("tag"), name: values.name, color: typeof values.color === "string" ? values.color : values.color.toHexString() }]);
    tagForm.resetFields();
    tagForm.setFieldValue("color", "#2F54EB");
    message.success("角色已添加");
  };

  const deleteLabel = (labelId: string) => {
    setLabels((items) => items.filter((item) => item.id !== labelId));
    setColumns((items) => items.map((column) => ({
      ...column,
      nodes: column.nodes.map((node) => ({
        ...node,
        labelIds: node.labelIds?.filter((id) => id !== labelId),
      })),
    })));
    setRoleFilter((items) => items.filter((id) => id !== labelId));
    message.success("角色已删除");
  };

  const openTagEditor = (tag?: Label) => {
    setEditingTagId(tag?.id);
    nodeTagForm.setFieldsValue({ name: tag?.name, color: tag?.color ?? "#2F54EB" });
  };

  const saveNodeTag = async () => {
    const values = await nodeTagForm.validateFields();
    const color = typeof values.color === "string" ? values.color : values.color.toHexString();
    if (editingTagId) {
      setNodeTags((items) => items.map((item) => item.id === editingTagId ? { ...item, name: values.name, color } : item));
      message.success("标签已更新");
    } else {
      setNodeTags((items) => [...items, { id: uid("node-tag"), name: values.name, color }]);
      message.success("标签已添加");
    }
    setEditingTagId(undefined);
    nodeTagForm.resetFields();
    nodeTagForm.setFieldValue("color", "#2F54EB");
  };

  const deleteNodeTag = (tagId: string) => {
    setNodeTags((items) => items.filter((item) => item.id !== tagId));
    setColumns((items) => items.map((column) => ({
      ...column,
      nodes: column.nodes.map((node) => ({ ...node, tagIds: node.tagIds?.filter((id) => id !== tagId) })),
    })));
    if (editingTagId === tagId) openTagEditor();
    message.success("标签已删除");
  };

  const roleFilterOptions = labels
    .filter((role) => columns.some((column) => column.nodes.some((node) => node.labelIds?.includes(role.id))))
    .map((role) => ({ value: role.id, label: role.name }));

  useEffect(() => {
    const availableRoleIds = new Set(roleFilterOptions.map((option) => option.value));
    setRoleFilter((items) => items.filter((id) => availableRoleIds.has(id)));
  }, [columns, labels]);

  const exportPng = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(canvasRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#F5F7FB",
        width: exportWidth,
        height: canvasRef.current.scrollHeight,
        style: {
          width: `${exportWidth}px`,
          minWidth: `${exportWidth}px`,
        },
        filter: (node) => !(node instanceof HTMLElement && node.dataset.exportHide === "true"),
      });
      const link = document.createElement("a");
      link.download = `${meta.title || "流程图"}.png`;
      link.href = dataUrl;
      link.click();
      message.success("PNG 已导出");
    } catch {
      message.error("导出失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  };

  const columnMenu = (column: ColumnItem, index: number): MenuProps => ({
    items: [
      { key: "left", label: "向左移动", icon: <ArrowLeft size={15} />, disabled: index === 0, onClick: () => moveColumn(column.id, -1) },
      { key: "right", label: "向右移动", icon: <ArrowRight size={15} />, disabled: index === columns.length - 1, onClick: () => moveColumn(column.id, 1) },
      { type: "divider" },
      { key: "edit", label: "编辑流程列", icon: <Pencil size={15} />, onClick: () => openColumn(column) },
      { key: "delete", label: "删除流程列", icon: <Trash2 size={15} />, danger: true, onClick: () => deleteColumn(column.id) },
    ],
  });

  if (!authReady) {
    return <div className="login-screen"><div className="login-loading"><Layers3 size={28} />正在打开 Flowcraft…</div></div>;
  }

  if (!isAuthenticated && !shareMode) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-brand"><span className="brand-mark"><Layers3 size={21} /></span><span>Flowcraft</span></div>
          <div className="login-icon"><LockKeyhole size={25} /></div>
          <Typography.Title level={2}>登录流程编辑器</Typography.Title>
          <Typography.Text type="secondary">登录后可创建、编辑和管理全部流程图。</Typography.Text>
          <Form form={loginForm} layout="vertical" onFinish={login} className="login-form">
            <Form.Item name="username" label="账号" rules={[{ required: true, message: "请输入账号" }]}>
              <Input size="large" autoComplete="username" placeholder="请输入账号" />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
              <Input.Password size="large" autoComplete="current-password" placeholder="请输入密码" />
            </Form.Item>
            <Button type="primary" size="large" htmlType="submit" block>登录</Button>
          </Form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ "--theme": themes[0].color, "--theme-soft": themes[0].soft } as React.CSSProperties}>
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-mark"><Layers3 size={19} /></span><span>Flowcraft</span></div>
        <div className="sidebar-head">
          <span>流程图列表</span>
          {!shareMode && <Tooltip title="新建流程"><Button type="text" size="small" icon={<Plus size={16} />} onClick={openNewFlow} aria-label="新建流程" /></Tooltip>}
        </div>
        <nav className="flow-nav">
          {flowDocs.map((item) => (
            <button key={item.id} type="button" className={`flow-nav-item ${item.id === activeFlowId ? "active" : ""}`} onClick={() => !shareMode && switchFlow(item.id)}>
              <span className="flow-nav-icon"><Layers3 size={15} /></span>
              <span className="flow-nav-copy"><strong>{item.meta.title}</strong><small>{item.columns.length} 个流程阶段</small></span>
              {item.id === activeFlowId && <span className="flow-nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          {shareMode ? <div className="readonly-badge"><Eye size={15} />只读分享页面</div> : (
            <Popconfirm title="删除当前流程？" description="该流程及其版本记录将被删除" okText="删除" cancelText="取消" disabled={flowDocs.length <= 1} onConfirm={deleteCurrentFlow}>
              <Button danger type="text" block disabled={flowDocs.length <= 1} icon={<Trash2 size={15} />}>删除当前流程</Button>
            </Popconfirm>
          )}
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <strong>{meta.title}</strong>
            {shareMode && <Tag color="blue" icon={<Eye size={12} />}>只读预览</Tag>}
          </div>
          {!shareMode && <div className="toolbar-center"><Segmented value={view} onChange={setView} options={["编辑视图", "展示视图"]} /></div>}
          <Space size={8} className="toolbar-actions">
            {!shareMode && <Button icon={<Share2 size={16} />} onClick={shareCurrentFlow}>分享</Button>}
            {editMode && <Button className="version-button" icon={<History size={16} />} onClick={() => setVersionOpen(true)}>{currentVersion}</Button>}
            {editMode && <Tooltip title="编辑流程信息"><Button icon={<Pencil size={16} />} onClick={openMeta}>流程设置</Button></Tooltip>}
            <Button type="primary" icon={<Download size={16} />} loading={exporting} onClick={exportPng}>导出 PNG</Button>
            {!shareMode && <Tooltip title="退出登录"><Button icon={<LogOut size={16} />} onClick={logout} aria-label="退出登录" /></Tooltip>}
          </Space>
        </header>

        <main className="workspace">
        <div className="workspace-head">
          <div>
            <div className="eyebrow"><Sparkles size={14} /> FLOW EDITOR</div>
            <Typography.Title level={2}>流程展示编辑器</Typography.Title>
            <Typography.Text type="secondary">将复杂流程整理成清晰、易读、可分享的横向图谱。</Typography.Text>
          </div>
          <Flex gap={10} align="center" wrap>
            <div className="role-filter">
              <Users size={16} />
              <Select
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                value={roleFilter}
                onChange={setRoleFilter}
                placeholder="按角色筛选"
                options={roleFilterOptions}
                notFoundContent="当前流程暂无角色"
              />
            </div>
            {editMode && <Button icon={<Users size={16} />} onClick={() => setLibraryOpen(true)}>角色库</Button>}
            {editMode && <Button icon={<Tags size={16} />} onClick={() => { openTagEditor(); setTagLibraryOpen(true); }}>标签库</Button>}
            {editMode && <Button type="primary" ghost icon={<Plus size={16} />} onClick={() => openColumn()}>添加流程列</Button>}
          </Flex>
        </div>

        <section className="canvas-wrap">
          <div className="flow-canvas" ref={canvasRef} style={{ width: displayWidth }}>
            <div className="flow-hero">
              <div className="hero-copy">
                <h1>{meta.title}</h1>
                {meta.subtitle && <p>{meta.subtitle}</p>}
              </div>
              <div className="flow-count"><strong>{columns.length}</strong><span>个流程阶段</span></div>
            </div>

            {columns.length ? (
              <div className="columns-track">
                {columns.map((column, columnIndex) => (
                  <div
                    className="column"
                    key={column.id}
                    style={{
                      "--column-theme": column.theme,
                      "--column-theme-soft": themes.find((item) => item.color === column.theme)?.soft ?? themes[0].soft,
                    } as React.CSSProperties}
                  >
                    <div className="column-card">
                      <div className="column-header-panel">
                        <div className="column-head">
                          <span className="step-no">{String(columnIndex + 1).padStart(2, "0")}</span>
                          {editMode && (
                            <Dropdown menu={columnMenu(column, columnIndex)} trigger={["click"]}>
                              <Button data-export-hide="true" type="text" className="more-button" icon={<Ellipsis size={18} />} aria-label="流程列操作" />
                            </Dropdown>
                          )}
                        </div>
                        <h2>{column.title}</h2>
                        {column.subtitle && <p className="column-subtitle">{column.subtitle}</p>}
                      </div>
                      <div className="node-list">
                        {column.nodes.length ? column.nodes.map((node, nodeIndex) => {
                          const nodeRoles = labels.filter((item) => node.labelIds?.includes(item.id));
                          const nodeTagItems = nodeTags.filter((item) => node.tagIds?.includes(item.id));
                          const roleMatched = !roleFilter.length || roleFilter.some((id) => node.labelIds?.includes(id));
                          return (
                            <div className="node-sequence" key={node.id}>
                              <article
                                className={`node-card previewable ${roleFilter.length ? roleMatched ? "role-match" : "role-dim" : ""}`}
                                role="button"
                                tabIndex={0}
                                onClick={() => setPreviewNode({ node, roles: nodeRoles, tags: nodeTagItems })}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    setPreviewNode({ node, roles: nodeRoles, tags: nodeTagItems });
                                  }
                                }}
                              >
                                <div className="node-topline">
                                  <div className="node-card-tags">
                                    {nodeTagItems.map((tag) => <Tag key={tag.id} color={tag.color}>{tag.name}</Tag>)}
                                  </div>
                                  {editMode && (
                                    <Space size={0} data-export-hide="true" className="node-actions" onClick={(event) => event.stopPropagation()}>
                                      <Tooltip title="查看详情"><Button type="text" size="small" icon={<Eye size={14} />} onClick={() => setPreviewNode({ node, roles: nodeRoles, tags: nodeTagItems })} /></Tooltip>
                                      <Tooltip title="上移"><Button type="text" size="small" disabled={nodeIndex === 0} icon={<ArrowUp size={14} />} onClick={() => moveNode(column.id, node.id, -1)} /></Tooltip>
                                      <Tooltip title="下移"><Button type="text" size="small" disabled={nodeIndex === column.nodes.length - 1} icon={<ArrowDown size={14} />} onClick={() => moveNode(column.id, node.id, 1)} /></Tooltip>
                                      <Tooltip title="编辑"><Button type="text" size="small" icon={<Pencil size={14} />} onClick={() => openNode(column.id, node)} /></Tooltip>
                                      <Popconfirm title="删除这个子节点？" okText="删除" cancelText="取消" onConfirm={() => deleteNode(column.id, node.id)}>
                                        <Tooltip title="删除"><Button type="text" danger size="small" icon={<Trash2 size={14} />} /></Tooltip>
                                      </Popconfirm>
                                    </Space>
                                  )}
                                </div>
                                <h3>{node.title}</h3>
                                {node.subtitle && <p>{node.subtitle}</p>}
                                {node.detail && <p className={`node-detail-preview ${editMode ? "single-line" : ""}`}>{node.detail}</p>}
                                {!!node.attachments?.length && (
                                  <div className="node-files">
                                    {node.attachments.map((file) => (
                                      <a key={file.id} href={file.dataUrl} download={file.name} title={file.name} onClick={(event) => event.stopPropagation()}>
                                        <FileText size={13} /><span>{file.name}</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {!!nodeRoles.length && (
                                  <div className="node-roles">
                                    {nodeRoles.map((role) => <Tag key={role.id} color={role.color}>{role.name}</Tag>)}
                                  </div>
                                )}
                              </article>
                              {nodeIndex < column.nodes.length - 1 && <div className="node-flow-arrow"><ChevronDown size={15} /></div>}
                            </div>
                          );
                        }) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无子节点" />}
                      </div>
                      {editMode && <Button data-export-hide="true" className="add-node" type="dashed" icon={<Plus size={15} />} onClick={() => openNode(column.id)}>添加子节点</Button>}
                    </div>
                    {columnIndex < columns.length - 1 && <div className="connector"><span /><ArrowRight size={17} /></div>}
                  </div>
                ))}
                {editMode && (
                  <button data-export-hide="true" className="add-column-card" onClick={() => openColumn()}>
                    <span><Plus size={20} /></span><strong>添加流程列</strong><small>继续扩展流程</small>
                  </button>
                )}
              </div>
            ) : (
              <div className="empty-flow"><Empty description="还没有流程列" /><Button type="primary" icon={<Plus size={16} />} onClick={() => openColumn()}>添加第一个流程列</Button></div>
            )}
          </div>
        </section>
          <div className="tipline"><CircleHelp size={15} /> {shareMode ? "这是只读分享页面，内容不可编辑。" : "提示：使用节点右上角按钮调整顺序；切换到展示视图可隐藏全部编辑控件。"}</div>
        </main>
      </div>

      <Modal title="新建流程" open={newFlowOpen} onCancel={() => setNewFlowOpen(false)} onOk={createNewFlow} okText="创建" cancelText="取消" width={500}>
        <Form form={newFlowForm} layout="vertical" requiredMark="optional" className="modal-form">
          <Form.Item name="title" label="主标题" rules={[{ required: true, message: "请输入流程主标题" }, { max: 32, message: "最多输入 32 个字" }]}><Input placeholder="例如：市场活动执行流程" showCount maxLength={32} /></Form.Item>
          <Form.Item name="subtitle" label="副标题"><Input.TextArea placeholder="补充说明该流程的用途（选填）" autoSize={{ minRows: 2, maxRows: 4 }} showCount maxLength={80} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title="版本记录"
        open={versionOpen}
        onCancel={() => setVersionOpen(false)}
        width={560}
        footer={[
          <Button key="close" onClick={() => setVersionOpen(false)}>关闭</Button>,
          <Button key="save" type="primary" icon={<Save size={15} />} onClick={saveVersion}>保存新版本</Button>,
        ]}
      >
        <div className="version-summary">
          <div><Typography.Text type="secondary">当前版本</Typography.Text><strong>{currentVersion}</strong></div>
          <Typography.Text type="secondary">版本记录保存在当前浏览器中</Typography.Text>
        </div>
        <div className="version-list">
          {versions.map((snapshot) => (
            <div className={`version-row ${snapshot.version === currentVersion ? "current" : ""}`} key={snapshot.id}>
              <div className="version-mark"><History size={16} /></div>
              <div className="version-info">
                <div><strong>{snapshot.version}</strong>{snapshot.version === currentVersion && <Tag color="blue">当前</Tag>}</div>
                <span>{new Date(snapshot.createdAt).toLocaleString("zh-CN", { hour12: false })}</span>
              </div>
              {snapshot.version !== currentVersion && (
                <Popconfirm title={`确认回档到 ${snapshot.version}？`} description="当前未保存的修改将被替换" okText="确认回档" cancelText="取消" onConfirm={() => restoreVersion(snapshot)}>
                  <Button icon={<RotateCcw size={14} />}>回档</Button>
                </Popconfirm>
              )}
            </div>
          ))}
        </div>
      </Modal>

      <Modal title="流程设置" open={metaOpen} onCancel={() => setMetaOpen(false)} onOk={saveMeta} okText="保存" cancelText="取消" width={520}>
        <Form form={metaForm} layout="vertical" requiredMark="optional" className="modal-form">
          <Form.Item name="title" label="主标题" rules={[{ required: true, message: "请输入主标题" }, { max: 32, message: "最多输入 32 个字" }]}><Input placeholder="例如：产品设计交付流程" showCount maxLength={32} /></Form.Item>
          <Form.Item name="subtitle" label="副标题"><Input.TextArea placeholder="补充说明这个流程的目的（选填）" autoSize={{ minRows: 2, maxRows: 4 }} showCount maxLength={80} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={editingColumnId ? "编辑流程列" : "添加流程列"} open={columnOpen} onCancel={() => setColumnOpen(false)} onOk={saveColumn} okText={editingColumnId ? "保存" : "添加"} cancelText="取消" width={480}>
        <Form form={columnForm} layout="vertical" requiredMark="optional" className="modal-form">
          <Form.Item name="title" label="流程列标题" rules={[{ required: true, message: "请输入流程列标题" }]}><Input placeholder="例如：方案设计" /></Form.Item>
          <Form.Item name="subtitle" label="说明"><Input placeholder="简单说明这个阶段（选填）" /></Form.Item>
          <Form.Item name="theme" label="主题颜色" rules={[{ required: true, message: "请选择主题颜色" }]}>
            <div className="theme-grid">
              {themes.map((item) => (
                <button key={item.color} type="button" className={`theme-choice ${watchedColumnTheme === item.color ? "selected" : ""}`} onClick={() => { columnForm.setFieldValue("theme", item.color); columnForm.validateFields(["theme"]); }}>
                  <span style={{ background: item.color }} />{item.name}{watchedColumnTheme === item.color && <Check size={15} />}
                </button>
              ))}
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingNode?.nodeId ? "编辑子节点" : "添加子节点"} open={nodeOpen} onCancel={() => setNodeOpen(false)} onOk={saveNode} okText={editingNode?.nodeId ? "保存" : "添加"} cancelText="取消" width={500}>
        <Form form={nodeForm} layout="vertical" requiredMark="optional" className="modal-form">
          <Form.Item label="标签">
            <Flex gap={8}>
              <Form.Item name="tagIds" noStyle><Select mode="multiple" allowClear maxTagCount="responsive" placeholder="从标签库选择，可多选" className="grow" options={nodeTags.map((item) => ({ value: item.id, label: item.name }))} optionRender={(option) => { const tag = nodeTags.find((item) => item.id === option.value); return tag ? <Tag color={tag.color}>{tag.name}</Tag> : option.label; }} /></Form.Item>
              <Button icon={<Tags size={15} />} onClick={() => { openTagEditor(); setTagLibraryOpen(true); }}>管理</Button>
            </Flex>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入子节点标题" }]}><Input placeholder="例如：高保真原型" /></Form.Item>
          <Form.Item name="subtitle" label="副标题"><Input.TextArea placeholder="补充说明（选填）" autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item>
          <Form.Item name="detail" label="详情" rules={[{ max: 200, message: "详情最多输入 200 个字" }]}>
            <Input.TextArea placeholder="输入节点的详细说明（选填）" autoSize={{ minRows: 3, maxRows: 6 }} showCount maxLength={200} />
          </Form.Item>
          <Form.Item label="上传文件" extra="支持 PNG、Word、PPT、PDF、视频和音频等格式，可上传多份；静态分享版单个文件限 1MB。">
            <Upload.Dragger
              multiple
              showUploadList={false}
              accept="image/png,.doc,.docx,.ppt,.pptx,.pdf,video/*,audio/*"
              beforeUpload={(file) => { void addAttachment(file); return Upload.LIST_IGNORE; }}
            >
              <p className="ant-upload-drag-icon"><UploadCloud size={28} /></p>
              <p className="ant-upload-text">点击或拖拽文件到这里</p>
            </Upload.Dragger>
            {!!pendingAttachments.length && (
              <div className="attachment-list">
                {pendingAttachments.map((file) => (
                  <div className="attachment-row" key={file.id}>
                    <FileText size={15} /><span>{file.name}</span><small>{Math.max(1, Math.round(file.size / 1024))} KB</small>
                    <Button type="text" danger size="small" icon={<Trash2 size={14} />} onClick={() => setPendingAttachments((items) => items.filter((item) => item.id !== file.id))} aria-label={`删除 ${file.name}`} />
                  </div>
                ))}
              </div>
            )}
          </Form.Item>
          <Form.Item label="角色" required>
            <Flex gap={8}>
              <Form.Item name="labelIds" noStyle rules={[{ required: true, type: "array", min: 1, message: "请至少选择一个角色" }]}><Select mode="multiple" allowClear maxTagCount="responsive" placeholder="从角色库选择，可多选" className="grow" options={labels.map((item) => ({ value: item.id, label: item.name }))} optionRender={(option) => { const role = labels.find((item) => item.id === option.value); return role ? <Tag color={role.color}>{role.name}</Tag> : option.label; }} /></Form.Item>
              <Button icon={<Users size={15} />} onClick={() => setLibraryOpen(true)}>管理</Button>
            </Flex>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="节点详情"
        open={!!previewNode}
        onCancel={() => setPreviewNode(undefined)}
        footer={<Button type="primary" onClick={() => setPreviewNode(undefined)}>关闭</Button>}
        width={620}
      >
        {previewNode && (
          <div className="node-preview-modal">
            <div className="node-preview-heading">
              <div className="share-icon"><Eye size={20} /></div>
              <div><Typography.Title level={3}>{previewNode.node.title}</Typography.Title>{previewNode.node.subtitle && <Typography.Text type="secondary">{previewNode.node.subtitle}</Typography.Text>}</div>
            </div>
            {!!previewNode.tags.length && (
              <div className="node-preview-section preview-tags">
                <Typography.Text className="preview-label">标签</Typography.Text>
                <div>{previewNode.tags.map((tag) => <Tag key={tag.id} color={tag.color}>{tag.name}</Tag>)}</div>
              </div>
            )}
            {previewNode.node.detail && (
              <div className="node-preview-section"><Typography.Text className="preview-label">详情</Typography.Text><Typography.Paragraph>{previewNode.node.detail}</Typography.Paragraph></div>
            )}
            {!!previewNode.node.attachments?.length && (
              <div className="node-preview-section">
                <Typography.Text className="preview-label">附件</Typography.Text>
                <div className="preview-files">
                  {previewNode.node.attachments.map((file) => (
                    <a key={file.id} href={file.dataUrl} download={file.name}><FileText size={16} /><span>{file.name}</span><small>{Math.max(1, Math.round(file.size / 1024))} KB</small><Download size={14} /></a>
                  ))}
                </div>
              </div>
            )}
            {!!previewNode.roles.length && (
              <div className="node-preview-section preview-tags">
                <Typography.Text className="preview-label">角色</Typography.Text>
                <div>{previewNode.roles.map((role) => <Tag key={role.id} color={role.color}>{role.name}</Tag>)}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal title="分享只读流程" open={shareOpen} onCancel={() => setShareOpen(false)} footer={<Button type="primary" icon={<Copy size={15} />} onClick={copyShareLink}>复制链接</Button>} width={620}>
        <div className="share-panel">
          <div className="share-icon"><Share2 size={20} /></div>
          <div><Typography.Text strong>任何获得链接的人都可以预览</Typography.Text><Typography.Paragraph type="secondary">分享页面不会显示编辑、新增或删除控件，链接内容是生成时的流程快照。</Typography.Paragraph></div>
        </div>
        <Input.TextArea value={shareLink} readOnly autoSize={{ minRows: 3, maxRows: 5 }} onFocus={(event) => event.currentTarget.select()} />
      </Modal>

      <Modal title="角色库" open={libraryOpen} onCancel={() => setLibraryOpen(false)} footer={<Button type="primary" onClick={() => setLibraryOpen(false)}>完成</Button>} width={560}>
        <Form form={tagForm} initialValues={{ color: "#2F54EB" }} layout="vertical" className="tag-creator">
          <Typography.Text strong>新增角色</Typography.Text>
          <Flex gap={8} align="start" className="tag-create-row">
            <Form.Item name="name" rules={[{ required: true, message: "请输入角色名" }, { max: 12, message: "最多 12 个字" }]}><Input placeholder="角色名" maxLength={12} /></Form.Item>
            <Form.Item name="color" rules={[{ required: true }]}><ColorPicker showText /></Form.Item>
            <Button type="primary" icon={<Plus size={15} />} onClick={addLabel}>添加</Button>
          </Flex>
        </Form>
        <Divider />
        <div className="library-head"><Typography.Text strong>全部角色</Typography.Text><Typography.Text type="secondary">{labels.length} 个</Typography.Text></div>
        <div className="tag-library">
          {labels.length ? labels.map((label) => (
            <div className="tag-row" key={label.id}><Tag color={label.color}>{label.name}</Tag><Popconfirm title="删除后，节点将不再关联此角色" okText="删除" cancelText="取消" onConfirm={() => deleteLabel(label.id)}><Button type="text" danger icon={<Trash2 size={15} />} /></Popconfirm></div>
          )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有角色" />}
        </div>
      </Modal>

      <Modal title="标签库" open={tagLibraryOpen} onCancel={() => { setTagLibraryOpen(false); openTagEditor(); }} footer={<Button type="primary" onClick={() => { setTagLibraryOpen(false); openTagEditor(); }}>完成</Button>} width={560}>
        <Form form={nodeTagForm} initialValues={{ color: "#2F54EB" }} layout="vertical" className="tag-creator">
          <Typography.Text strong>{editingTagId ? "编辑标签" : "新增标签"}</Typography.Text>
          <Flex gap={8} align="start" className="tag-create-row">
            <Form.Item name="name" rules={[{ required: true, message: "请输入标签名" }, { max: 12, message: "最多 12 个字" }]}><Input placeholder="标签名" maxLength={12} /></Form.Item>
            <Form.Item name="color" rules={[{ required: true }]}><ColorPicker showText /></Form.Item>
            <Button type="primary" icon={editingTagId ? <Save size={15} /> : <Plus size={15} />} onClick={saveNodeTag}>{editingTagId ? "保存" : "添加"}</Button>
          </Flex>
        </Form>
        <Divider />
        <div className="library-head"><Typography.Text strong>全部标签</Typography.Text><Typography.Text type="secondary">{nodeTags.length} 个</Typography.Text></div>
        <div className="tag-library">
          {nodeTags.length ? nodeTags.map((tag) => (
            <div className="tag-row" key={tag.id}>
              <Tag color={tag.color}>{tag.name}</Tag>
              <Space size={0}>
                <Button type="text" icon={<Pencil size={15} />} onClick={() => openTagEditor(tag)} aria-label={`编辑 ${tag.name}`} />
                <Popconfirm title="删除后，节点将不再显示此标签" okText="删除" cancelText="取消" onConfirm={() => deleteNodeTag(tag.id)}><Button type="text" danger icon={<Trash2 size={15} />} /></Popconfirm>
              </Space>
            </div>
          )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有标签" />}
        </div>
      </Modal>
    </div>
  );
}

export default function Home() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#2F54EB", borderRadius: 10, fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif' }, components: { Button: { controlHeight: 38 }, Modal: { titleFontSize: 18 } } }}>
      <App><FlowEditor /></App>
    </ConfigProvider>
  );
}
