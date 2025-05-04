// Mock Ant Design components
const Table = ({ dataSource, columns }) => (
  <table data-testid="mock-table">
    <thead>
      <tr>
        {columns.map((column, index) => (
          <th key={index}>{column.title}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {dataSource?.map((item, rowIndex) => (
        <tr key={rowIndex} data-testid={`row-${rowIndex}`}>
          {columns.map((column, colIndex) => (
            <td key={colIndex}>
              {column.render
                ? column.render(item[column.dataIndex], item)
                : item[column.dataIndex]}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const Modal = ({ visible, title, onCancel, onOk, children }) => (
  visible ? (
    <div data-testid="mock-modal">
      <div data-testid="modal-title">{title}</div>
      <div data-testid="modal-content">{children}</div>
      <button onClick={onCancel} data-testid="modal-cancel">Cancel</button>
      <button onClick={onOk} data-testid="modal-ok">OK</button>
    </div>
  ) : null
);

const Button = ({ onClick, children, type, icon }) => (
  <button 
    onClick={onClick} 
    data-testid={`mock-button-${type || 'default'}`}
    data-icon={icon ? 'true' : 'false'}
  >
    {children}
  </button>
);

// Create Option component for Select
const Option = ({ value, children }) => (
  <option value={value}>{children}</option>
);

// Create Select with Option
const Select = ({ onChange, value, options }) => (
  <select 
    data-testid="mock-select" 
    value={value || ''} 
    onChange={e => onChange && onChange(e.target.value)}
  >
    {options?.map((option, index) => (
      <option key={index} value={option.value}>{option.label}</option>
    ))}
  </select>
);

// Attach Option to Select
Select.Option = Option;

const Form = {
  Item: ({ label, name, children }) => (
    <div data-testid={`form-item-${name}`}>
      <label>{label}</label>
      {children}
    </div>
  ),
  useForm: () => [{
    getFieldsValue: jest.fn().mockReturnValue({}),
    setFieldsValue: jest.fn(),
    resetFields: jest.fn(),
    validateFields: jest.fn().mockResolvedValue({}),
  }],
};

const Input = ({ value, onChange }) => (
  <input 
    data-testid="mock-input" 
    value={value || ''} 
    onChange={e => onChange && onChange(e)} 
  />
);

const Checkbox = ({ checked, onChange }) => (
  <input 
    type="checkbox" 
    data-testid="mock-checkbox" 
    checked={checked || false} 
    onChange={e => onChange && onChange(e)} 
  />
);

const Space = ({ children }) => (
  <div data-testid="mock-space">{children}</div>
);

const Card = ({ title, children }) => (
  <div data-testid="mock-card">
    {title && <div data-testid="card-title">{title}</div>}
    <div data-testid="card-content">{children}</div>
  </div>
);

// Create Typography components
const Title = ({ children, level }) => (
  <div data-testid={`typography-title-${level || 1}`}>{children}</div>
);

const Text = ({ children, type }) => (
  <span data-testid={`typography-text-${type || 'default'}`}>{children}</span>
);

const Paragraph = ({ children }) => (
  <p data-testid="typography-paragraph">{children}</p>
);

// Attach them to Typography
const Typography = { Title, Text, Paragraph };
// Also export them individually for destructuring
Typography.Title = Title;
Typography.Text = Text;
Typography.Paragraph = Paragraph;

const message = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  loading: jest.fn(),
};

const Popconfirm = ({ title, onConfirm, onCancel, children }) => (
  <div data-testid="mock-popconfirm">
    <div data-testid="popconfirm-title">{title}</div>
    <div data-testid="popconfirm-content">{children}</div>
    <button onClick={onConfirm} data-testid="popconfirm-confirm">Yes</button>
    <button onClick={onCancel} data-testid="popconfirm-cancel">No</button>
  </div>
);

const Tag = ({ children, color }) => (
  <span data-testid={`mock-tag-${color || 'default'}`}>{children}</span>
);

const Tooltip = ({ title, children }) => (
  <div data-testid="mock-tooltip">
    <div data-testid="tooltip-content">{children}</div>
    <div data-testid="tooltip-title" style={{ display: 'none' }}>{title}</div>
  </div>
);

const Spin = ({ spinning, children }) => (
  <div data-testid="mock-spin" data-spinning={spinning}>
    {children}
  </div>
);

const Empty = ({ description }) => (
  <div data-testid="mock-empty">{description || 'No data'}</div>
);

const Divider = ({ children }) => (
  <div data-testid="mock-divider">{children}</div>
);

const Drawer = ({ visible, title, onClose, children }) => (
  visible ? (
    <div data-testid="mock-drawer">
      <div data-testid="drawer-title">{title}</div>
      <div data-testid="drawer-content">{children}</div>
      <button onClick={onClose} data-testid="drawer-close">Close</button>
    </div>
  ) : null
);

const Badge = ({ count, children }) => (
  <div data-testid="mock-badge">
    {children}
    <span data-testid="badge-count">{count}</span>
  </div>
);

const Alert = ({ message, type, description }) => (
  <div data-testid={`mock-alert-${type || 'info'}`}>
    <div data-testid="alert-message">{message}</div>
    {description && <div data-testid="alert-description">{description}</div>}
  </div>
);

const Switch = ({ checked, onChange }) => (
  <input 
    type="checkbox" 
    data-testid="mock-switch" 
    checked={checked || false} 
    onChange={e => onChange && onChange(e.target.checked)} 
  />
);

export { 
  Table, Modal, Button, Select, Form, Input, Checkbox, Space,
  Card, Typography, message, Popconfirm, Tag, Tooltip, Spin,
  Empty, Divider, Drawer, Badge, Alert, Switch
}; 