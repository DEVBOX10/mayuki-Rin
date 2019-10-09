import { observer } from 'mobx-react';
import { Icon, Stack, StackItem } from 'office-ui-fabric-react';
import { Pivot, PivotItem } from 'office-ui-fabric-react/lib/Pivot';
import * as React from 'react';
import { createUrl } from '../../domain/RequestRecord';
import { appStore } from '../../store/AppStore';
import { DetailViewType, inspectorStore } from '../../store/InspectorStore';
import { inspectorTimelineStore } from '../../store/InspectorTimelineStore';
import { InspectorDetailCommandBar } from './InspectorDetail.CommandBar';
import * as styles from './InspectorDetail.css';
import { InspectorDetailExceptionView } from './InspectorDetail.ExceptionView';
import { InspectorDetailRequestResponseView } from './InspectorDetail.RequestResponseView';
import { InspectorDetailTimelineView } from './InspectorDetail.Timeline';
import { InspectorDetailTraceView } from './InspectorDetail.TraceView';

// Container Component
@observer
export class InspectorDetail extends React.Component {
  public render() {
    const selectedRecord = inspectorStore.currentRecordDetail;

    const whenCompleted = (c: () => any) => (selectedRecord != null && selectedRecord.IsCompleted ? c() : <></>);

    return (
      <>
        {inspectorStore.isRecordDeleted && (
          <div className={styles.inspectorDetailDeleted}>
            <div className={styles.inspectorDetailDeleted_Content}>
              <Icon iconName="PageRemove" className={styles.inspectorDetailDeletedContent_Icon} />
              <p>The record has been deleted or expired.</p>
            </div>
          </div>
        )}
        {!inspectorStore.isRecordDeleted && (
          <div className={styles.inspectorDetail}>
            <div className={styles.inspectorDetail_CommandBar}>
              <Stack horizontal={true}>
                <StackItem grow={true}>
                  {selectedRecord != null && (
                    <div className={styles.inspectorDetail_Pivot}>
                      <Pivot selectedKey={inspectorStore.currentDetailView} onLinkClick={this.onPivotItemClicked}>
                        <PivotItem itemKey={DetailViewType.Request} headerText="Request" itemIcon="CloudUpload" />
                        {whenCompleted(() => (
                          <PivotItem itemKey={DetailViewType.Response} headerText="Response" itemIcon="CloudDownload" />
                        ))}
                        {whenCompleted(() => (
                          <PivotItem
                            itemKey={DetailViewType.Timeline}
                            headerText="Timeline"
                            itemIcon="TimelineProgress"
                          />
                        ))}
                        <PivotItem itemKey={DetailViewType.Trace} headerText="Trace" itemIcon="TimeEntry" />
                        {selectedRecord.Exception ? (
                          <PivotItem
                            itemKey={DetailViewType.Exception}
                            headerText="Exception"
                            itemIcon="StatusErrorFull"
                          />
                        ) : (
                          <></>
                        )}
                      </Pivot>
                    </div>
                  )}
                </StackItem>
                <StackItem>
                  <InspectorDetailCommandBar
                    endpointUrlBase={appStore.endpointUrlBase}
                    currentRecordDetail={inspectorStore.currentRecordDetail}
                    requestBody={inspectorStore.requestBody}
                  />
                </StackItem>
              </Stack>
            </div>
            {selectedRecord != null && (
              <>
                <div className={styles.inspectorDetail_DetailView}>
                  {inspectorStore.currentDetailView === DetailViewType.Request && this.renderRequestView()}
                  {inspectorStore.currentDetailView === DetailViewType.Response && this.renderResponseView()}
                  {inspectorStore.currentDetailView === DetailViewType.Timeline && (
                    <InspectorDetailTimelineView
                      data={selectedRecord.Timeline}
                      isTraceVisibleInTimeline={inspectorTimelineStore.isTraceVisibleInTimeline}
                      calloutTarget={inspectorTimelineStore.calloutTarget}
                      calloutTimelineData={inspectorTimelineStore.calloutTimelineData}
                      isCalloutVisible={inspectorTimelineStore.isCalloutVisible}
                      dismissCallout={inspectorTimelineStore.dismissCallout}
                      showCallout={inspectorTimelineStore.showCallout}
                      toggleTraceVisibility={inspectorTimelineStore.toggleTraceVisibility}
                    />
                  )}
                  {inspectorStore.currentDetailView === DetailViewType.Trace && (
                    <div className={styles.inspectorDetail_TraceView}>
                      <InspectorDetailTraceView
                        record={selectedRecord}
                        enableWordWrap={inspectorStore.enableTraceViewWordWrap}
                        toggleWordWrap={inspectorStore.toggleTraceViewWordWrap}
                      />
                    </div>
                  )}
                  {inspectorStore.currentDetailView === DetailViewType.Exception && (
                    <InspectorDetailExceptionView record={selectedRecord} />
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </>
    );
  }

  public renderResponseView() {
    const selectedRecord = inspectorStore.currentRecordDetail!;
    const headers = selectedRecord.ResponseHeaders;

    return (
      <InspectorDetailRequestResponseView
        record={selectedRecord}
        generals={[{ key: 'StatusCode', value: selectedRecord.ResponseStatusCode + '' }]}
        headers={headers}
        body={inspectorStore.responseBody}
        paneSize={inspectorStore.requestResponsePaneSize}
        onPaneSizeChange={inspectorStore.onUpdateRequestResponsePaneSize}
      />
    );
  }

  public renderRequestView() {
    const selectedRecord = inspectorStore.currentRecordDetail!;
    const headers = { ...selectedRecord.RequestHeaders };
    const url = createUrl(selectedRecord);

    return (
      <InspectorDetailRequestResponseView
        record={selectedRecord}
        generals={[
          { key: 'Method', value: selectedRecord.Method },
          { key: 'Url', value: url },
          { key: 'Remote Address', value: selectedRecord.RemoteIpAddress }
        ]}
        headers={headers}
        body={inspectorStore.requestBody}
        paneSize={inspectorStore.requestResponsePaneSize}
        onPaneSizeChange={inspectorStore.onUpdateRequestResponsePaneSize}
      />
    );
  }

  private onPivotItemClicked = (item: PivotItem) => {
    inspectorStore.selectDetailView(item.props.itemKey as DetailViewType);
  };
}
