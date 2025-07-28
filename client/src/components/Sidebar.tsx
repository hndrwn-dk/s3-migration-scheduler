import React from 'react';
import classNames from 'classnames';
import {
  ChartBarIcon,
  CogIcon,
  ArrowRightIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const menuItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: ChartBarIcon,
      description: 'Overview and statistics'
    },
    {
      id: 'configure' as TabType,
      label: 'Configure',
      icon: CogIcon,
      description: 'Setup S3 connections'
    },
    {
      id: 'migrate' as TabType,
      label: 'Migrate',
      icon: ArrowRightIcon,
      description: 'Start new migration'
    },
    {
      id: 'history' as TabType,
      label: 'History',
      icon: ClockIcon,
      description: 'Migration history'
    },
    {
      id: 'logs' as TabType,
      label: 'Logs',
      icon: DocumentTextIcon,
      description: 'View migration logs'
    }
  ];

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={classNames(
                    'w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon 
                    className={classNames(
                      'w-5 h-5 mr-3',
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    )} 
                  />
                  <div>
                    <div className={classNames(
                      'font-medium',
                      isActive ? 'text-blue-700' : 'text-gray-900'
                    )}>
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.description}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

    </aside>
  );
};

export default Sidebar;