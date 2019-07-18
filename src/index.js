import './style.css';

import { DocumentSelectionExample } from './component/document-selection-example';
import { excute } from './component/d3-force-layout-dag-component';

// 실 데이터로 반영할 경우 두번째 인자를 지우면 됨.
excute(parent.document, true);