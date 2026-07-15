"use client";

import { useMemo, useRef, useState } from "react";
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
} from "antd";
import type { MenuProps } from "antd";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CircleHelp,
  Download,
  Ellipsis,
  Layers3,
  Library,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toPng } from "html-to-image";

type ThemeColor = { name: string; color: string; soft: string };
type Label = { id: string; name: string; color: string };
type NodeItem = { id: string; labelId?: string; title: string; subtitle?: string };
type ColumnItem = { id: string; title: string; subtitle?: string; nodes: NodeItem[] };
type FlowMeta = { title: string; subtitle?: string; theme: string };

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
    nodes: [
      { id: "node-1", labelId: "tag-1", title: "用户访谈", subtitle: "收集真实场景与核心痛点" },
      { id: "node-2", labelId: "tag-3", title: "需求归类", subtitle: "按优先级整理需求池" },
    ],
  },
  {
    id: "col-2",
    title: "方案设计",
    subtitle: "形成可验证的解决方案",
    nodes: [
      { id: "node-3", labelId: "tag-2", title: "流程草图", subtitle: "梳理关键路径和异常分支" },
      { id: "node-4", labelId: "tag-1", title: "高保真原型", subtitle: "完成核心页面交互" },
      { id: "node-5", labelId: "tag-3", title: "设计评审", subtitle: "确认范围、风险与交付标准" },
    ],
  },
  {
    id: "col-3",
    title: "开发交付",
    subtitle: "实现、测试并发布",
    nodes: [
      { id: "node-6", labelId: "tag-2", title: "功能开发", subtitle: "按迭代计划实现功能" },
      { id: "node-7", labelId: "tag-4", title: "验收上线", subtitle: "验证指标并持续复盘" },
    ],
  },
];

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function FlowEditor() {
  const { message } = App.useApp();
  const [meta, setMeta] = useState<FlowMeta>({ title: "产品设计交付流程", subtitle: "从需求洞察到稳定上线的协作路径", theme: themes[0].color });
  const [columns, setColumns] = useState<ColumnItem[]>(initialColumns);
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [metaOpen, setMetaOpen] = useState(false);
  const [columnOpen, setColumnOpen] = useState(false);
  const [nodeOpen, setNodeOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string>();
  const [editingNode, setEditingNode] = useState<{ columnId: string; nodeId?: string }>();
  const [view, setView] = useState<"编辑视图" | "展示视图">("编辑视图");
  const [exporting, setExporting] = useState(false);
  const [metaForm] = Form.useForm();
  const [columnForm] = Form.useForm();
  const [nodeForm] = Form.useForm();
  const [tagForm] = Form.useForm();
  const watchedTheme = Form.useWatch("theme", metaForm);
  const canvasRef = useRef<HTMLDivElement>(null);

  const theme = useMemo(() => themes.find((item) => item.color === meta.theme) ?? themes[0], [meta.theme]);
  const editMode = view === "编辑视图";

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
    columnForm.setFieldsValue({ title: column?.title, subtitle: column?.subtitle });
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
    nodeForm.setFieldsValue({ labelId: node?.labelId, title: node?.title, subtitle: node?.subtitle });
    setNodeOpen(true);
  };

  const saveNode = async () => {
    const values = await nodeForm.validateFields();
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
    message.success("标签已添加");
  };

  const deleteLabel = (labelId: string) => {
    setLabels((items) => items.filter((item) => item.id !== labelId));
    setColumns((items) => items.map((column) => ({ ...column, nodes: column.nodes.map((node) => node.labelId === labelId ? { ...node, labelId: undefined } : node) })));
    message.success("标签已删除");
  };

  const exportPng = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(canvasRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#F5F7FB",
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

  return (
    <div className="app-shell" style={{ "--theme": theme.color, "--theme-soft": theme.soft } as React.CSSProperties}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Layers3 size={19} /></span><span>Flowcraft</span></div>
        <div className="toolbar-center"><Segmented value={view} onChange={setView} options={["编辑视图", "展示视图"]} /></div>
        <Space size={10}>
          <Tooltip title="编辑流程信息"><Button icon={<Pencil size={16} />} onClick={openMeta}>流程设置</Button></Tooltip>
          <Button type="primary" icon={<Download size={16} />} loading={exporting} onClick={exportPng}>导出 PNG</Button>
        </Space>
      </header>

      <main className="workspace">
        <div className="workspace-head">
          <div>
            <div className="eyebrow"><Sparkles size={14} /> FLOW EDITOR</div>
            <Typography.Title level={2}>流程展示编辑器</Typography.Title>
            <Typography.Text type="secondary">将复杂流程整理成清晰、易读、可分享的横向图谱。</Typography.Text>
          </div>
          {editMode && (
            <Space>
              <Button icon={<Library size={16} />} onClick={() => setLibraryOpen(true)}>标签库</Button>
              <Button type="primary" ghost icon={<Plus size={16} />} onClick={() => openColumn()}>添加流程列</Button>
            </Space>
          )}
        </div>

        <section className="canvas-wrap">
          <div className="flow-canvas" ref={canvasRef}>
            <div className="flow-hero">
              <div className="hero-copy">
                <span className="theme-pill"><span className="theme-dot" />{theme.name}</span>
                <h1>{meta.title}</h1>
                {meta.subtitle && <p>{meta.subtitle}</p>}
              </div>
              <div className="flow-count"><strong>{columns.length}</strong><span>个流程阶段</span></div>
            </div>

            {columns.length ? (
              <div className="columns-track">
                {columns.map((column, columnIndex) => (
                  <div className="column" key={column.id}>
                    <div className="column-card">
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
                      <Divider />
                      <div className="node-list">
                        {column.nodes.length ? column.nodes.map((node, nodeIndex) => {
                          const label = labels.find((item) => item.id === node.labelId);
                          return (
                            <article className="node-card" key={node.id}>
                              <div className="node-topline">
                                {label ? <Tag color={label.color}>{label.name}</Tag> : <span />}
                                {editMode && (
                                  <Space size={0} data-export-hide="true" className="node-actions">
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
                            </article>
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
        <div className="tipline"><CircleHelp size={15} /> 提示：使用节点右上角按钮调整顺序；切换到展示视图可隐藏全部编辑控件。</div>
      </main>

      <Modal title="流程设置" open={metaOpen} onCancel={() => setMetaOpen(false)} onOk={saveMeta} okText="保存" cancelText="取消" width={520}>
        <Form form={metaForm} layout="vertical" requiredMark="optional" className="modal-form">
          <Form.Item name="title" label="主标题" rules={[{ required: true, message: "请输入主标题" }, { max: 32, message: "最多输入 32 个字" }]}><Input placeholder="例如：产品设计交付流程" showCount maxLength={32} /></Form.Item>
          <Form.Item name="subtitle" label="副标题"><Input.TextArea placeholder="补充说明这个流程的目的（选填）" autoSize={{ minRows: 2, maxRows: 4 }} showCount maxLength={80} /></Form.Item>
          <Form.Item name="theme" label="主题颜色" rules={[{ required: true, message: "请选择主题颜色" }]}>
            <div className="theme-grid">
              {themes.map((item) => (
                <button key={item.color} type="button" className={`theme-choice ${watchedTheme === item.color ? "selected" : ""}`} onClick={() => { metaForm.setFieldValue("theme", item.color); metaForm.validateFields(["theme"]); }}>
                  <span style={{ background: item.color }} />{item.name}{watchedTheme === item.color && <Check size={15} />}
                </button>
              ))}
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingColumnId ? "编辑流程列" : "添加流程列"} open={columnOpen} onCancel={() => setColumnOpen(false)} onOk={saveColumn} okText={editingColumnId ? "保存" : "添加"} cancelText="取消" width={480}>
        <Form form={columnForm} layout="vertical" requiredMark="optional" className="modal-form">
          <Form.Item name="title" label="流程列标题" rules={[{ required: true, message: "请输入流程列标题" }]}><Input placeholder="例如：方案设计" /></Form.Item>
          <Form.Item name="subtitle" label="说明"><Input placeholder="简单说明这个阶段（选填）" /></Form.Item>
        </Form>
      </Modal>

      <Modal title={editingNode?.nodeId ? "编辑子节点" : "添加子节点"} open={nodeOpen} onCancel={() => setNodeOpen(false)} onOk={saveNode} okText={editingNode?.nodeId ? "保存" : "添加"} cancelText="取消" width={500}>
        <Form form={nodeForm} layout="vertical" requiredMark="optional" className="modal-form">
          <Form.Item label="标签">
            <Flex gap={8}>
              <Form.Item name="labelId" noStyle><Select allowClear placeholder="从标签库选择" className="grow" options={labels.map((item) => ({ value: item.id, label: <Tag color={item.color}>{item.name}</Tag> }))} /></Form.Item>
              <Button icon={<Library size={15} />} onClick={() => setLibraryOpen(true)}>管理</Button>
            </Flex>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入子节点标题" }]}><Input placeholder="例如：高保真原型" /></Form.Item>
          <Form.Item name="subtitle" label="副标题"><Input.TextArea placeholder="补充说明（选填）" autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="标签库" open={libraryOpen} onCancel={() => setLibraryOpen(false)} footer={<Button type="primary" onClick={() => setLibraryOpen(false)}>完成</Button>} width={560}>
        <Form form={tagForm} initialValues={{ color: "#2F54EB" }} layout="vertical" className="tag-creator">
          <Typography.Text strong>新增标签</Typography.Text>
          <Flex gap={8} align="start" className="tag-create-row">
            <Form.Item name="name" rules={[{ required: true, message: "请输入标签名" }, { max: 12, message: "最多 12 个字" }]}><Input placeholder="标签名" maxLength={12} /></Form.Item>
            <Form.Item name="color" rules={[{ required: true }]}><ColorPicker showText /></Form.Item>
            <Button type="primary" icon={<Plus size={15} />} onClick={addLabel}>添加</Button>
          </Flex>
        </Form>
        <Divider />
        <div className="library-head"><Typography.Text strong>全部标签</Typography.Text><Typography.Text type="secondary">{labels.length} 个</Typography.Text></div>
        <div className="tag-library">
          {labels.length ? labels.map((label) => (
            <div className="tag-row" key={label.id}><Tag color={label.color}>{label.name}</Tag><Popconfirm title="删除后，节点将不再显示此标签" okText="删除" cancelText="取消" onConfirm={() => deleteLabel(label.id)}><Button type="text" danger icon={<Trash2 size={15} />} /></Popconfirm></div>
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
