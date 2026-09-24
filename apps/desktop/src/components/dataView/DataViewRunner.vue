<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Play, Loader2, AlertCircle, CheckCircle2, LayoutGrid, Check, GripVertical, RefreshCw, ChevronsDownUp, ChevronsUpDown, Table2, BarChart3, Clock3, Zap } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import LightTooltip from "@/components/ui/LightTooltip.vue";
import DangerConfirmDialog from "@/components/editor/DangerConfirmDialog.vue";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataGrid from "@/components/grid/DataGrid.vue";
import QueryChart from "@/components/chart/QueryChart.vue";
import QueryLoadingState from "@/components/common/QueryLoadingState.vue";
import { useDataViewStore } from "@/stores/dataViewStore";
import { resolveDynamicDefault } from "@/lib/dataView/dynamicDefaults";
import { resolveDisplayResult } from "@/lib/dataView/dataViewResultDisplay";
import { AUTO_REFRESH_INTERVALS, autoRefreshTickMs, formatShortDuration, nextAutoRefreshDelayMs } from "@/lib/dataView/dataViewAutoRefresh";
import { formatRedisCommandResult } from "@/lib/redis/redisValuePresentation";
import { formatElapsedSeconds } from "@/lib/common/elapsedTime";
import { clampGridPos, columnWidthPx, compactLayout, gridContainerHeightPx, gridRectToPixels, pixelDeltaToGridUnits, resolveGridLayout } from "@/lib/dataView/dataViewGridLayout";
import type { DataView, DataViewDisplayMode, DataViewGridPos, DataViewParamValue, DataViewQuery, DataViewQueryResult } from "@/types/dataView";

const props = defineProps<{
  view: DataView;
  /** Minimal share-page mode: no card chrome, fills the viewport. */
  embedded?: boolean;
}>();

const { t } = useI18n();
const store = useDataViewStore();

const values = reactive<Record<string, string>>({});
const running = ref(false);
const runError = ref<string | null>(null);
const results = ref<DataViewQueryResult[]>([]);
const runElapsedMs = ref(0);
const runElapsedSeconds = computed(() => formatElapsedSeconds(runElapsedMs.value));
let runElapsedTimer: ReturnType<typeof setInterval> | undefined;
let runStartedAt = 0;

function startRunTimer() {
  stopRunTimer();
  runStartedAt = Date.now();
  runElapsedMs.value = 0;
  runElapsedTimer = setInterval(() => {
    runElapsedMs.value = Date.now() - runStartedAt;
  }, 100);
}

function stopRunTimer() {
  if (runElapsedTimer) clearInterval(runElapsedTimer);
  runElapsedTimer = undefined;
}

const displayModes = reactive<Record<string, DataViewDisplayMode>>({});
// Per-mutation execution state keyed by query id.
const mutationBusy = reactive<Record<string, boolean>>({});
const mutationResult = reactive<Record<string, DataViewQueryResult>>({});

const readQueries = computed(() => props.view.queries.filter((q) => (q.kind ?? "query") !== "mutation"));
const mutationQueries = computed(() => props.view.queries.filter((q) => q.kind === "mutation"));

function resetDefaults() {
  for (const key of Object.keys(values)) delete values[key];
  for (const variable of props.view.variables) {
    values[variable.name] = resolveDynamicDefault(variable.defaultValue);
  }
}

const missingRequired = computed(() => props.view.variables.filter((v) => v.required && !String(values[v.name] ?? "").trim()).map((v) => v.name));

// Grafana-style dashboard controls: manual run, auto-refresh interval, and a
// "refreshed N ago" status driven by a 1s ticker.
const autoRefreshId = ref<string>("off");
const lastRunStartedAtMs = ref<number | null>(null);
const lastRefreshedAtMs = ref<number | null>(null);
const ageNowMs = ref(Date.now());
let autoRefreshTimer: ReturnType<typeof setTimeout> | undefined;
let ageTimer: ReturnType<typeof setInterval> | undefined;

const refreshedAgoLabel = computed(() => {
  if (lastRefreshedAtMs.value === null) return "";
  return formatShortDuration(ageNowMs.value - lastRefreshedAtMs.value);
});

function autoRefreshIntervalLabel(id: string): string {
  return id === "off" ? t("dataView.autoRefreshOff") : id;
}

/** Re-arms the auto-refresh setTimeout chain from the last run's start, so slow
 *  runs never stack ticks. Hidden documents skip the run but keep the chain. */
function scheduleAutoRefresh() {
  if (autoRefreshTimer) {
    clearTimeout(autoRefreshTimer);
    autoRefreshTimer = undefined;
  }
  const tickMs = autoRefreshTickMs(autoRefreshId.value);
  if (!tickMs || readQueries.value.length === 0) return;
  autoRefreshTimer = setTimeout(
    () => {
      autoRefreshTimer = undefined;
      if (!document.hidden && !running.value && missingRequired.value.length === 0) void run();
      scheduleAutoRefresh();
    },
    nextAutoRefreshDelayMs(tickMs, lastRunStartedAtMs.value, Date.now()),
  );
}

watch(autoRefreshId, scheduleAutoRefresh);

onMounted(() => {
  ageTimer = setInterval(() => {
    ageNowMs.value = Date.now();
  }, 1000);
});

// Variables row collapse state (Grafana hides the variables submenu the same way).
const variablesVisible = ref(true);

// Dashboard-grid layout (drag/resize) for the results panels, edit-mode only.
const layoutEditing = ref(false);
const layoutDraft = reactive<Record<string, DataViewGridPos>>({});
const gridContainerRef = ref<HTMLElement | null>(null);
const containerWidthPx = ref(0);
const colWidthPx = computed(() => (containerWidthPx.value > 0 ? columnWidthPx(containerWidthPx.value) : 0));
const gridHeightPx = computed(() => gridContainerHeightPx(Object.values(layoutDraft)));
let containerResizeObserver: ResizeObserver | null = null;

watch(gridContainerRef, (el, prevEl) => {
  if (prevEl) containerResizeObserver?.unobserve(prevEl);
  if (el) {
    containerWidthPx.value = el.getBoundingClientRect().width;
    containerResizeObserver ??= new ResizeObserver(([entry]) => {
      if (entry) containerWidthPx.value = entry.contentRect.width;
    });
    containerResizeObserver.observe(el);
  }
});

function seedLayoutDraft() {
  const resolved = resolveGridLayout(readQueries.value);
  for (const key of Object.keys(layoutDraft)) delete layoutDraft[key];
  for (const [id, gridPos] of resolved) layoutDraft[id] = gridPos;
}

function panelStyle(queryId: string) {
  const gridPos = layoutDraft[queryId];
  if (!gridPos) return undefined;
  const rect = gridRectToPixels(gridPos, colWidthPx.value);
  const active = panelDragState.value?.queryId === queryId || panelResizeState.value?.queryId === queryId;
  return {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    transition: active ? "none" : "left 160ms ease-out, top 160ms ease-out, width 160ms ease-out, height 160ms ease-out",
    zIndex: active ? 20 : 1,
  };
}

interface PanelGesture {
  queryId: string;
  startX: number;
  startY: number;
  startGridPos: DataViewGridPos;
  /** Snapshot of every other panel's layout at gesture start (compaction obstacles never mutate). */
  otherEntries: { id: string; gridPos: DataViewGridPos }[];
  liveGridPos: DataViewGridPos;
}

/** Live-recompacts every other panel around `tentative` (obstacle), and previews the gesture's own panel at `tentative`. */
function applyGestureFrame(state: PanelGesture, tentative: DataViewGridPos) {
  state.liveGridPos = tentative;
  const recompacted = compactLayout(state.otherEntries, [tentative]);
  for (const [id, gridPos] of recompacted) layoutDraft[id] = gridPos;
  layoutDraft[state.queryId] = tentative;
}

function revertGesture(state: PanelGesture) {
  layoutDraft[state.queryId] = state.startGridPos;
  for (const entry of state.otherEntries) layoutDraft[entry.id] = entry.gridPos;
}

/** Final full compaction (including the dragged/resized panel) for a gap-free layout, then persists. */
function commitGesture(state: PanelGesture) {
  const compacted = compactLayout([{ id: state.queryId, gridPos: state.liveGridPos }, ...state.otherEntries]);
  for (const [id, gridPos] of compacted) layoutDraft[id] = gridPos;
  void persistLayout();
}

function snapshotOtherPanels(queryId: string): { id: string; gridPos: DataViewGridPos }[] {
  return Object.entries(layoutDraft)
    .filter(([id]) => id !== queryId)
    .map(([id, gridPos]) => ({ id, gridPos }));
}

const panelDragState = ref<PanelGesture | null>(null);
let dragFrame = 0;
let pendingDragClientX = 0;
let pendingDragClientY = 0;

function startPanelDrag(queryId: string, event: PointerEvent) {
  if (!layoutEditing.value || event.button !== 0) return;
  const gridPos = layoutDraft[queryId];
  if (!gridPos) return;
  event.preventDefault();
  document.body.style.userSelect = "none";
  panelDragState.value = { queryId, startX: event.clientX, startY: event.clientY, startGridPos: gridPos, otherEntries: snapshotOtherPanels(queryId), liveGridPos: gridPos };
  window.addEventListener("pointermove", onPanelDragMove, true);
  window.addEventListener("pointerup", onPanelDragEnd, true);
  window.addEventListener("pointercancel", onPanelDragCancel, true);
}

function applyPanelDragFrame() {
  dragFrame = 0;
  const state = panelDragState.value;
  if (!state || colWidthPx.value <= 0) return;
  const { dx, dy } = pixelDeltaToGridUnits(pendingDragClientX - state.startX, pendingDragClientY - state.startY, colWidthPx.value);
  applyGestureFrame(state, clampGridPos({ x: state.startGridPos.x + dx, y: state.startGridPos.y + dy, w: state.startGridPos.w, h: state.startGridPos.h }));
}

function onPanelDragMove(event: PointerEvent) {
  if (!panelDragState.value) return;
  event.preventDefault();
  pendingDragClientX = event.clientX;
  pendingDragClientY = event.clientY;
  if (!dragFrame) dragFrame = requestAnimationFrame(applyPanelDragFrame);
}

function finishPanelDrag(commit: boolean) {
  const state = panelDragState.value;
  window.removeEventListener("pointermove", onPanelDragMove, true);
  window.removeEventListener("pointerup", onPanelDragEnd, true);
  window.removeEventListener("pointercancel", onPanelDragCancel, true);
  document.body.style.userSelect = "";
  if (dragFrame) {
    cancelAnimationFrame(dragFrame);
    dragFrame = 0;
  }
  panelDragState.value = null;
  if (!state) return;
  if (commit) commitGesture(state);
  else revertGesture(state);
}

function onPanelDragEnd() {
  finishPanelDrag(true);
}

function onPanelDragCancel() {
  finishPanelDrag(false);
}

const panelResizeState = ref<PanelGesture | null>(null);
let resizeFrame = 0;
let pendingResizeClientX = 0;
let pendingResizeClientY = 0;

function startPanelResize(queryId: string, event: PointerEvent) {
  if (!layoutEditing.value || event.button !== 0) return;
  const gridPos = layoutDraft[queryId];
  if (!gridPos) return;
  event.preventDefault();
  event.stopPropagation();
  document.body.style.userSelect = "none";
  panelResizeState.value = { queryId, startX: event.clientX, startY: event.clientY, startGridPos: gridPos, otherEntries: snapshotOtherPanels(queryId), liveGridPos: gridPos };
  window.addEventListener("pointermove", onPanelResizeMove, true);
  window.addEventListener("pointerup", onPanelResizeEnd, true);
  window.addEventListener("pointercancel", onPanelResizeCancel, true);
}

function applyPanelResizeFrame() {
  resizeFrame = 0;
  const state = panelResizeState.value;
  if (!state || colWidthPx.value <= 0) return;
  const { dx, dy } = pixelDeltaToGridUnits(pendingResizeClientX - state.startX, pendingResizeClientY - state.startY, colWidthPx.value);
  applyGestureFrame(state, clampGridPos({ x: state.startGridPos.x, y: state.startGridPos.y, w: state.startGridPos.w + dx, h: state.startGridPos.h + dy }));
}

function onPanelResizeMove(event: PointerEvent) {
  if (!panelResizeState.value) return;
  event.preventDefault();
  pendingResizeClientX = event.clientX;
  pendingResizeClientY = event.clientY;
  if (!resizeFrame) resizeFrame = requestAnimationFrame(applyPanelResizeFrame);
}

function finishPanelResize(commit: boolean) {
  const state = panelResizeState.value;
  window.removeEventListener("pointermove", onPanelResizeMove, true);
  window.removeEventListener("pointerup", onPanelResizeEnd, true);
  window.removeEventListener("pointercancel", onPanelResizeCancel, true);
  document.body.style.userSelect = "";
  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = 0;
  }
  panelResizeState.value = null;
  if (!state) return;
  if (commit) commitGesture(state);
  else revertGesture(state);
}

function onPanelResizeEnd() {
  finishPanelResize(true);
}

function onPanelResizeCancel() {
  finishPanelResize(false);
}

/** Persists the current panel layout onto the view's queries; failures just mean it isn't saved yet (layout still applies locally). */
async function persistLayout() {
  const updated: DataView = { ...props.view, queries: props.view.queries.map((query) => ({ ...query, gridPos: layoutDraft[query.id] ?? query.gridPos ?? null })) };
  try {
    await store.save(updated);
  } catch {
    // Ignored: the in-memory layout already reflects the user's change.
  }
}

onBeforeUnmount(() => {
  finishPanelDrag(false);
  finishPanelResize(false);
  containerResizeObserver?.disconnect();
  stopRunTimer();
  if (autoRefreshTimer) clearTimeout(autoRefreshTimer);
  if (ageTimer) clearInterval(ageTimer);
});

watch(
  () => props.view.id,
  () => {
    resetDefaults();
    seedLayoutDraft();
    // Skip straight to results when every variable already has a usable value.
    if (readQueries.value.length > 0 && missingRequired.value.length === 0) run();
  },
  { immediate: true },
);

watch(readQueries, seedLayoutDraft);

function buildPayload(): Record<string, DataViewParamValue> {
  const payload: Record<string, DataViewParamValue> = {};
  for (const variable of props.view.variables) {
    payload[variable.name] = { kind: variable.kind ?? "string", value: String(values[variable.name] ?? "") };
  }
  return payload;
}

function displayModeFor(result: DataViewQueryResult): DataViewDisplayMode {
  return displayModes[result.queryId] ?? result.displayMode ?? props.view.defaultDisplayMode;
}

function setDisplayMode(queryId: string, mode: DataViewDisplayMode) {
  displayModes[queryId] = mode;
}

function chartConfigFor(queryId: string) {
  return props.view.queries.find((q) => q.id === queryId)?.chartConfig;
}

function queryFor(queryId: string) {
  return props.view.queries.find((q) => q.id === queryId);
}

function displayResultFor(result: DataViewQueryResult) {
  return resolveDisplayResult(result, queryFor(result.queryId));
}

/** Row count of a panel's dataset; `null` when there is no tabular result. */
function panelRowCount(result: DataViewQueryResult): number | null {
  const display = displayResultFor(result);
  return display ? display.rows.length : null;
}

function panelColumnCount(result: DataViewQueryResult): number {
  return displayResultFor(result)?.columns.length ?? 0;
}

async function run() {
  if (running.value || readQueries.value.length === 0) return;
  runError.value = null;
  running.value = true;
  lastRunStartedAtMs.value = Date.now();
  startRunTimer();
  try {
    const response = await store.execute(props.view.id, buildPayload(), {
      queryIds: readQueries.value.map((q) => q.id),
      allowMutations: false,
    });
    results.value = response.results;
  } catch (error) {
    runError.value = error instanceof Error ? error.message : String(error);
  } finally {
    running.value = false;
    lastRefreshedAtMs.value = Date.now();
    stopRunTimer();
    scheduleAutoRefresh();
  }
}

const pendingMutation = ref<DataViewQuery | null>(null);
const mutationDialogOpen = ref(false);

function requestMutation(query: DataViewQuery) {
  if (mutationBusy[query.id] || missingRequired.value.length > 0) return;
  pendingMutation.value = query;
  mutationDialogOpen.value = true;
}

async function executeMutation() {
  const query = pendingMutation.value;
  if (!query || mutationBusy[query.id]) return;
  mutationDialogOpen.value = false;
  pendingMutation.value = null;
  mutationBusy[query.id] = true;
  try {
    const response = await store.execute(props.view.id, buildPayload(), { queryIds: [query.id], allowMutations: true });
    const result = response.results.find((r) => r.queryId === query.id);
    if (result) mutationResult[query.id] = result;
  } catch (error) {
    mutationResult[query.id] = {
      queryId: query.id,
      title: query.title ?? "",
      displayMode: "table",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    mutationBusy[query.id] = false;
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Dashboard controls (Grafana-style): run, auto-refresh, status, layout -->
    <div v-if="readQueries.length > 0 || view.variables.length > 0" class="relative flex h-8 shrink-0 items-center gap-1.5 border-b bg-muted/30 px-2">
      <Button v-if="readQueries.length > 0" size="sm" class="h-6 gap-1 px-2.5 text-xs" :disabled="running || missingRequired.length > 0" @click="run">
        <Loader2 v-if="running" class="h-3 w-3 animate-spin" />
        <Play v-else class="h-3 w-3" />
        {{ t("dataView.run") }}
      </Button>

      <template v-if="readQueries.length > 0">
        <LightTooltip :text="t('dataView.autoRefresh')" side="bottom">
          <Select v-model="autoRefreshId">
            <SelectTrigger class="h-6 w-[86px] gap-1 px-2 text-xs" :aria-label="t('dataView.autoRefresh')">
              <Clock3 class="h-3 w-3 shrink-0" :class="autoRefreshId !== 'off' ? 'text-primary' : 'text-muted-foreground'" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="interval in AUTO_REFRESH_INTERVALS" :key="interval.id" :value="interval.id">{{ autoRefreshIntervalLabel(interval.id) }}</SelectItem>
            </SelectContent>
          </Select>
        </LightTooltip>

        <span v-if="running" class="flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
          <Loader2 class="h-3 w-3 animate-spin" />
          {{ runElapsedSeconds }}s
        </span>
        <span v-else-if="refreshedAgoLabel" class="flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
          <RefreshCw class="h-3 w-3" />
          {{ t("dataView.refreshedAgo", { duration: refreshedAgoLabel }) }}
        </span>
      </template>

      <span class="flex-1" />

      <LightTooltip v-if="view.variables.length > 0" :text="variablesVisible ? t('dataView.hideVariables') : t('dataView.showVariables')" side="bottom">
        <Button variant="ghost" size="icon" class="h-6 w-6" :aria-label="variablesVisible ? t('dataView.hideVariables') : t('dataView.showVariables')" @click="variablesVisible = !variablesVisible">
          <ChevronsDownUp v-if="variablesVisible" class="h-3.5 w-3.5" />
          <ChevronsUpDown v-else class="h-3.5 w-3.5" />
        </Button>
      </LightTooltip>
      <LightTooltip v-if="!embedded && readQueries.length > 0" :text="layoutEditing ? t('dataView.doneEditing') : t('dataView.editLayout')" side="bottom">
        <Button variant="ghost" size="icon" class="h-6 w-6" :class="layoutEditing ? 'bg-accent text-primary' : ''" :aria-label="layoutEditing ? t('dataView.doneEditing') : t('dataView.editLayout')" @click="layoutEditing = !layoutEditing">
          <Check v-if="layoutEditing" class="h-3.5 w-3.5" />
          <LayoutGrid v-else class="h-3.5 w-3.5" />
        </Button>
      </LightTooltip>

      <!-- Thin indeterminate loading bar while (re-)running, Grafana-style -->
      <div v-if="running" class="data-view-loading-bar absolute inset-x-0 bottom-0" aria-hidden="true" />
    </div>

    <!-- Shared variable inputs, collapsible like Grafana's variables submenu -->
    <div v-if="view.variables.length > 0 && variablesVisible" class="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b bg-muted/10 px-3 py-2">
      <div v-for="variable in view.variables" :key="variable.name" class="flex items-center gap-1.5">
        <Label class="shrink-0 text-xs font-medium text-muted-foreground">
          {{ variable.label || variable.name }}
          <span v-if="variable.required" class="text-destructive">*</span>
        </Label>

        <template v-if="variable.inputType === 'select'">
          <Select v-model="values[variable.name]">
            <SelectTrigger class="h-7 w-44 text-xs">
              <SelectValue :placeholder="variable.name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in variable.options ?? []" :key="option" :value="option">{{ option }}</SelectItem>
            </SelectContent>
          </Select>
        </template>

        <template v-else-if="variable.kind === 'boolean'">
          <Switch :model-value="values[variable.name] === 'true'" @update:model-value="(checked: boolean) => (values[variable.name] = checked ? 'true' : 'false')" />
        </template>

        <template v-else>
          <Input v-model="values[variable.name]" :type="variable.kind === 'date' ? 'date' : variable.kind === 'number' ? 'number' : 'text'" class="h-7 w-44 text-xs" :placeholder="variable.name" @keydown.enter="run" />
        </template>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-auto">
      <div v-if="runError" class="flex items-center gap-2 border-b border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
        <AlertCircle class="h-4 w-4 shrink-0" />
        <span class="min-w-0 break-all">{{ runError }}</span>
      </div>

      <!-- Update (mutation) actions -->
      <div v-if="mutationQueries.length > 0" class="mx-3 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
        <div class="flex items-center gap-1.5 px-0.5 pb-1.5">
          <Zap class="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span class="text-xs font-medium text-amber-700 dark:text-amber-300">{{ t("dataView.updates") }}</span>
        </div>
        <div v-for="query in mutationQueries" :key="query.id" class="flex flex-wrap items-center gap-2 rounded-md px-1 py-1.5">
          <span class="min-w-0 flex-1 truncate text-[13px]" :title="query.title || t('dataView.untitledQuery')">{{ query.title || t("dataView.untitledQuery") }}</span>
          <Button size="sm" variant="destructive" class="h-6 gap-1 px-2 text-xs" :disabled="mutationBusy[query.id] || missingRequired.length > 0" @click="requestMutation(query)">
            <Loader2 v-if="mutationBusy[query.id]" class="h-3 w-3 animate-spin" />
            <Zap v-else class="h-3 w-3" />
            {{ t("dataView.executeUpdate") }}
          </Button>
          <span v-if="mutationResult[query.id]?.error" class="flex w-full items-center gap-1 text-xs text-destructive">
            <AlertCircle class="h-3.5 w-3.5 shrink-0" />
            <span class="min-w-0 break-all">{{ mutationResult[query.id].error }}</span>
          </span>
          <span v-else-if="mutationResult[query.id]?.result" class="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 class="h-3.5 w-3.5 shrink-0" />
            {{ t("dataView.affectedRows", { count: mutationResult[query.id].result?.affected_rows ?? 0 }) }}
          </span>
          <span v-else-if="mutationResult[query.id]?.redisValue !== undefined" class="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 class="h-3.5 w-3.5 shrink-0" />
            {{ formatRedisCommandResult(mutationResult[query.id].redisValue) }}
          </span>
        </div>
      </div>

      <!-- Results, laid out on a 12-column dashboard grid; drag/resize handles only render in edit mode. -->
      <div v-if="results.length > 0" class="p-3">
        <div ref="gridContainerRef" class="relative" :style="{ height: `${gridHeightPx}px` }">
          <div v-for="result in results" :key="result.queryId" class="group absolute flex flex-col overflow-hidden rounded-lg border bg-card shadow-xs transition-shadow hover:shadow-md" :class="layoutEditing ? 'ring-1 ring-primary/30' : ''" :style="panelStyle(result.queryId)">
            <div class="flex h-8 shrink-0 items-center gap-1.5 border-b bg-muted/30 px-2.5">
              <GripVertical v-if="layoutEditing" class="h-4 w-4 shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing" @pointerdown="startPanelDrag(result.queryId, $event)" />
              <span class="min-w-0 flex-1 truncate text-[13px] font-medium" :title="result.title || t('dataView.untitledQuery')">{{ result.title || t("dataView.untitledQuery") }}</span>
              <div v-if="!result.error && displayResultFor(result)" class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <LightTooltip :text="t('dataView.table')" side="bottom">
                  <Button variant="ghost" size="icon" class="h-5 w-5" :class="displayModeFor(result) === 'table' ? 'bg-accent text-foreground' : 'text-muted-foreground'" :aria-label="t('dataView.table')" @click="setDisplayMode(result.queryId, 'table')">
                    <Table2 class="h-3 w-3" />
                  </Button>
                </LightTooltip>
                <LightTooltip :text="t('dataView.chart')" side="bottom">
                  <Button variant="ghost" size="icon" class="h-5 w-5" :class="displayModeFor(result) === 'chart' ? 'bg-accent text-foreground' : 'text-muted-foreground'" :aria-label="t('dataView.chart')" @click="setDisplayMode(result.queryId, 'chart')">
                    <BarChart3 class="h-3 w-3" />
                  </Button>
                </LightTooltip>
              </div>
            </div>

            <div v-if="result.error" class="flex min-h-0 flex-1 items-center gap-2 px-3 py-3 text-[13px] text-destructive">
              <AlertCircle class="h-4 w-4 shrink-0" />
              <span class="min-w-0 break-all">{{ result.error }}</span>
            </div>
            <div v-else-if="panelRowCount(result) === 0" class="flex min-h-0 flex-1 items-center justify-center px-3 py-6 text-[12px] text-muted-foreground">
              {{ t("dataView.panelNoData") }}
            </div>
            <div v-else-if="displayResultFor(result)" class="min-h-0 flex-1">
              <QueryChart v-if="displayModeFor(result) === 'chart'" :result="displayResultFor(result)!" :default-chart-type="chartConfigFor(result.queryId)?.type" :default-x-column="chartConfigFor(result.queryId)?.xColumn" :default-y-columns="chartConfigFor(result.queryId)?.yColumns" />
              <DataGrid v-else :result="displayResultFor(result)!" :editable="false" />
            </div>

            <div v-if="!result.error && displayResultFor(result)" class="flex h-6 shrink-0 items-center border-t px-2.5 text-[11px] tabular-nums text-muted-foreground">
              {{ t("dataView.panelStats", { rows: panelRowCount(result) ?? 0, cols: panelColumnCount(result) }) }}
            </div>

            <div v-if="layoutEditing" class="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize touch-none text-muted-foreground" @pointerdown="startPanelResize(result.queryId, $event)">
              <svg viewBox="0 0 16 16" class="h-full w-full" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M13 3 L3 13 M13 8 L8 13 M13 13 L13 13" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <QueryLoadingState v-if="running && results.length === 0" label-key="dataView.running" :elapsed-seconds="runElapsedSeconds" class="m-3 rounded-lg border border-dashed p-8" />
      <div v-else-if="results.length === 0 && !running && readQueries.length > 0 && !runError" class="m-3 rounded-lg border border-dashed p-8 text-center text-[13px] text-muted-foreground">
        {{ t("dataView.emptyRunHint") }}
      </div>
    </div>

    <DangerConfirmDialog
      v-model:open="mutationDialogOpen"
      :sql="pendingMutation?.sqlTemplate ?? ''"
      :title="t('dataView.executeUpdate')"
      :message="t('dataView.confirmUpdate', { name: pendingMutation?.title || t('dataView.untitledQuery') })"
      :confirm-label="t('dataView.executeUpdate')"
      :cancelable="true"
      @confirm="executeMutation"
    />
  </div>
</template>

<style scoped>
/* Thin indeterminate progress bar pinned under the controls toolbar while a
 * run is in flight — the same affordance Grafana uses for dashboard loading. */
.data-view-loading-bar {
  height: 2px;
  overflow: hidden;
  background: transparent;
}

.data-view-loading-bar::after {
  content: "";
  display: block;
  height: 100%;
  width: 40%;
  border-radius: 9999px;
  background-color: var(--primary);
  animation: data-view-loading-slide 1.1s ease-in-out infinite;
}

@keyframes data-view-loading-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}
</style>
