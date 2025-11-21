import React from 'react';

const SectionCard = ({
  title,
  description,
  icon,
  children,
  className = "",
  actions = null,
  mobileActionsBelow = false
}) => {
  return (
    <div className={`liquidGlass-wrapper ${className}`} style={{borderRadius: '1rem', padding: '1.5rem'}}>
      {/* Liquid Glass Effect Layers */}
      <div className="liquidGlass-effect"></div>
      <div className="liquidGlass-tint"></div>
      <div className="liquidGlass-shine"></div>

      {/* Section Content */}
      <div className="relative" style={{zIndex: 20}}>
        {/* Section Header */}
        <div className={`${mobileActionsBelow ? 'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4' : 'flex items-start justify-between'} mb-6`}>
          <div className="flex items-center min-w-0 flex-1">
            {icon && (
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-4 flex-shrink-0" style={{ borderRadius: '100px', boxShadow: '0 0 6px rgba(83, 153, 217, 0.3)' }}>
                <svg className="w-5 h-5" style={{ color: '#5399d9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="heading-md" style={{ color: '#5399d9' }}>{title}</h3>
              {description && (
                <p className="text-sm text-soft mt-1">{description}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className={`flex space-x-2 ${mobileActionsBelow ? 'self-start sm:self-auto sm:flex-shrink-0' : ''}`}>
              {actions}
            </div>
          )}
        </div>

        {/* Section Content */}
        <div className="space-y-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SectionCard;