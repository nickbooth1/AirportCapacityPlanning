const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { 
      presets: ["@babel/preset-env", ["@babel/preset-react", { runtime: "automatic" }]] 
    }]
  },
  moduleNameMapper: {
    // Handle module aliases (if you configured them in your Next.js config)
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    // Style and asset mocks
    '\\.(css|less|sass|scss)$': '<rootDir>/tests/mocks/styleMock.js',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/tests/mocks/fileMock.js',
    // Mock antd components
    'antd/lib/table': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/modal': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/button': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/select': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/form': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/input': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/checkbox': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/space': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/card': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/typography': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/message': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/popconfirm': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/tag': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/tooltip': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/spin': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/empty': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/divider': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/drawer': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/badge': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/alert': '<rootDir>/tests/mocks/antdMock.js',
    'antd/lib/switch': '<rootDir>/tests/mocks/antdMock.js',
    // Mock ant design icons
    '@ant-design/icons/lib/icons/PlusOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/EditOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/DeleteOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/EyeOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/SearchOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/SaveOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/CloseOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/CheckOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/WarningOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/InfoCircleOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/LoadingOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/SettingOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/DownOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/UpOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/FilterOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/LinkOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/lib/icons/ExclamationCircleOutlined': '<rootDir>/tests/mocks/iconsMock.js',
    // Mock entire @ant-design/icons package
    '@ant-design/icons': '<rootDir>/tests/mocks/iconsMock.js',
    '@ant-design/icons/(.*)$': '<rootDir>/tests/mocks/iconsMock.js',
  },
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  transformIgnorePatterns: [
    '/node_modules/(?!antd|@ant-design|rc-.*)'
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);