import { History } from 'history';
import { action, computed, observable, runInAction } from 'mobx';
import { IHubClient } from '../api/hubClient';
import { BodyDataPayload, IRinCoreHub, RequestEventPayload, RequestRecordDetailPayload } from '../api/IRinCoreHub';
import { useContext, createContext } from 'react';

export class InspectorStore {
  @observable
  currentDetailView: DetailViewType = DetailViewType.Request;
  @observable
  selectedId: string | null = null;
  @observable
  query: string = '';
  @observable
  requestBody: BodyDataPayload | null = null;
  @observable
  responseBody: BodyDataPayload | null = null;
  @observable
  currentRecordDetail: RequestRecordDetailPayload | null = null;
  @observable
  isRecordDeleted: boolean = false;

  @observable
  leftPaneSize: number = 300;
  @observable
  requestResponsePaneSize: number | null = null;

  @observable
  items: RequestEventPayload[] = [];

  @observable
  enableTraceViewWordWrap: boolean = false;

  private hubClient!: IHubClient & IRinCoreHub;
  private requestEventQueue: { event: 'RequestBegin' | 'RequestEnd'; args: any }[] = [];
  private triggerRequestEventQueueTimerId?: number;
  private history!: History;

  @computed
  get selectedItem() {
    return this.items.find((x) => x.Id === this.selectedId);
  }

  @computed
  get filteredItems() {
    if (this.query == null || this.query.length === 0) {
      return this.items;
    }

    const regex = new RegExp(this.query.replace(/[.*+?^=!:${}()|[\]/\\]/g, '\\$&'), 'i');
    return this.items.filter((x) => x.Path.match(regex));
  }

  @action.bound
  onFilterChange(event?: React.ChangeEvent<HTMLInputElement>, newValue?: string) {
    this.query = newValue == null ? '' : newValue;
  }

  @action.bound
  async selectDetail(itemId: string, view?: DetailViewType, withoutNavigate: boolean = false) {
    this.selectedId = itemId;

    if (view != null) {
      this.currentDetailView = view;
    }

    if (!withoutNavigate) {
      this.history.push(`/Inspect/${this.selectedId}/${this.currentDetailView}`);
    }

    await this.updateCurrentRecordAsync(itemId);
  }

  @action.bound
  selectDetailView(view: DetailViewType) {
    this.currentDetailView = view;
    this.history.push(`/Inspect/${this.selectedId}/${this.currentDetailView}`);
  }

  @action.bound
  updateItems(records: RequestEventPayload[]) {
    this.items = records;
  }

  @action.bound
  async fetchItemsAsync() {
    const records = await this.hubClient.GetRecordingList();
    this.updateItems(records);
  }

  @action.bound
  async updateCurrentRecordAsync(itemId: string) {
    this.isRecordDeleted = false;

    const record = await this.hubClient.GetDetailById(itemId);
    if (record == null) {
      runInAction(() => {
        this.requestBody = null;
        this.responseBody = null;
        this.currentRecordDetail = null;
        this.selectedId = null;
        this.isRecordDeleted = true;
        // this.history.push(`/Inspect/`);
      });
      return;
    }

    if (this.currentDetailView === DetailViewType.Exception && record.Exception === null) {
      this.selectDetailView(DetailViewType.Request);
    }

    runInAction(() => {
      this.requestBody = null;
      this.responseBody = null;
      this.currentRecordDetail = record;
    });

    const requestBody = await this.hubClient.GetRequestBody(itemId);
    const responseBody = await this.hubClient.GetResponseBody(itemId);
    runInAction(() => {
      this.requestBody = requestBody;
      this.responseBody = responseBody;
    });
  }

  @action.bound
  onUpdateLeftPaneSize(newSize: number) {
    this.leftPaneSize = newSize;
    window.localStorage['Rin.Inspector.LeftPaneSize'] = this.leftPaneSize.toString();
  }
  @action.bound
  onUpdateRequestResponsePaneSize(newSize: number) {
    this.requestResponsePaneSize = newSize;
    window.localStorage['Rin.Inspector.RequestResponsePaneSize'] = this.requestResponsePaneSize.toString();
  }

  @action.bound
  toggleTraceViewWordWrap(value: boolean) {
    this.enableTraceViewWordWrap = value;
    window.localStorage['Rin.Inspector.EnableTraceViewWordWrap'] = JSON.stringify(value);
  }

  @action.bound
  ready(hubClient: IHubClient & IRinCoreHub, history: History) {
    this.history = history;
    this.hubClient = hubClient;
    this.hubClient.on('reconnecting', () => {
      runInAction(() => {
        this.requestBody = null;
        this.responseBody = null;
        this.currentRecordDetail = null;
        this.fetchItemsAsync();
      });
    });

    this.hubClient.on('RequestBegin', (args) => {
      this.requestEventQueue.push({ event: 'RequestBegin', args });
      this.triggerRequestEventQueue();
    });
    this.hubClient.on('RequestEnd', (args) => {
      this.requestEventQueue.push({ event: 'RequestEnd', args });
      this.triggerRequestEventQueue();
    });

    this.fetchItemsAsync();

    this.leftPaneSize = JSON.parse(window.localStorage['Rin.Inspector.LeftPaneSize'] || '300');
    this.requestResponsePaneSize = JSON.parse(window.localStorage['Rin.Inspector.RequestResponsePaneSize'] || 'null');
    this.enableTraceViewWordWrap = JSON.parse(window.localStorage['Rin.Inspector.EnableTraceViewWordWrap'] || 'false');
  }

  private triggerRequestEventQueue() {
    if (this.triggerRequestEventQueueTimerId !== undefined) {
      clearTimeout(this.triggerRequestEventQueueTimerId);
      this.triggerRequestEventQueueTimerId = undefined;
    }

    this.triggerRequestEventQueueTimerId = window.setTimeout(() => {
      const items = this.items.concat([]);
      this.requestEventQueue.forEach((x) => {
        const item = x.args[0];
        if (x.event === 'RequestBegin') {
          items.unshift(item);
        } else if (x.event === 'RequestEnd') {
          const itemIndex = items.findIndex((y) => y.Id === item.Id);
          items[itemIndex] = item;

          if (item.Id === this.selectedId) {
            this.updateCurrentRecordAsync(item.Id);
          }
        }
      });
      this.requestEventQueue = [];
      this.updateItems(items);
    }, 100);
  }
}

export enum DetailViewType {
  Request = 'Request',
  Response = 'Response',
  Timeline = 'Timeline',
  Trace = 'Trace',
  Exception = 'Exception',
}

const inspectorStoreContext = createContext(new InspectorStore());
export const useInspectorStore = () => useContext(inspectorStoreContext);
