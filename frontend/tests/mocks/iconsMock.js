// Mock icons
const createIconMock = (name) => {
  const Icon = () => <span data-testid={`icon-${name}`} />;
  Icon.displayName = name;
  return Icon;
};

// Create common icon mocks
const PlusOutlined = createIconMock('PlusOutlined');
const EditOutlined = createIconMock('EditOutlined');
const DeleteOutlined = createIconMock('DeleteOutlined');
const EyeOutlined = createIconMock('EyeOutlined');
const SearchOutlined = createIconMock('SearchOutlined');
const SaveOutlined = createIconMock('SaveOutlined');
const CloseOutlined = createIconMock('CloseOutlined');
const CheckOutlined = createIconMock('CheckOutlined');
const WarningOutlined = createIconMock('WarningOutlined');
const InfoCircleOutlined = createIconMock('InfoCircleOutlined');
const LoadingOutlined = createIconMock('LoadingOutlined');
const SettingOutlined = createIconMock('SettingOutlined');
const DownOutlined = createIconMock('DownOutlined');
const UpOutlined = createIconMock('UpOutlined');
const FilterOutlined = createIconMock('FilterOutlined');
const LinkOutlined = createIconMock('LinkOutlined');
const ExclamationCircleOutlined = createIconMock('ExclamationCircleOutlined');

export {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  SettingOutlined,
  DownOutlined,
  UpOutlined,
  FilterOutlined,
  LinkOutlined,
  ExclamationCircleOutlined,
}; 