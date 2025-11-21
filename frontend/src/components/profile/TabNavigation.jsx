import React from 'react';
import { useNavigate } from 'react-router-dom';

const TabNavigation = ({ activeTab, tabs, onTabChange }) => {
  const navigate = useNavigate();

  // Map tab IDs to URLs
  const getTabUrl = (tabId) => {
    switch (tabId) {
      case 'profile':
        return '/profile';
      case 'subscription':
        return '/subscription';
      case 'input-templates':
      case 'tab1':
        return '/template';
      case 'tab2':
        return '/template-out';
      default:
        return '/profile';
    }
  };

  const handleTabClick = (tabId) => {
    if (onTabChange) {
      // Use callback if provided (for local state management)
      onTabChange(tabId);
    } else {
      // Use navigation if no callback (for URL-based tabs)
      navigate(getTabUrl(tabId));
    }
  };

  const getActiveTabIndex = () => {
    return tabs.findIndex(tab => tab.id === activeTab);
  };

  const activeIndex = getActiveTabIndex();

  return (
    <div className="liquidGlass-wrapper p-1 mb-8">
      {/* Liquid Glass Effect Layers */}
      <div className="liquidGlass-effect"></div>
      <div className="liquidGlass-tint"></div>
      <div className="liquidGlass-shine"></div>

      {/* Tab Indicator */}
      <div
        className="absolute top-1 bottom-1 tab-liquid-glass"
        style={{
          width: `calc(${100 / tabs.length}% - 4px)`,
          left: `calc(${activeIndex * (100 / tabs.length)}% + 2px)`,
          transition: 'left 1.2s cubic-bezier(0.23, 1, 0.32, 1), width 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
          transformOrigin: 'center',
          zIndex: 10
        }}
      />

      {/* Tab Buttons */}
      <div className="relative flex w-full" style={{zIndex: 20}}>
        {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          className={`
            relative z-10 flex-1 flex items-center justify-center px-2 sm:px-6 py-3 text-sm font-medium
            transition-colors duration-1000 ease-out
            ${activeTab === tab.id
              ? 'text-white'
              : 'text-neutral-600 hover:text-neutral-800'
            }
          `}
          style={{borderRadius: '100px'}}
        >
          {tab.icon && (
            <svg className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
          )}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
      </div>
    </div>
  );
};

export default TabNavigation;