/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, Spin } from '@douyinfe/semi-ui';
import { IconTickCircle, IconUser, IconMail, IconCoinMoneyStroked, IconHistogram, IconKey } from '@douyinfe/semi-icons';
import Title from '@douyinfe/semi-ui/lib/es/typography/title';
import Text from '@douyinfe/semi-ui/lib/es/typography/text';
import { useTranslation } from 'react-i18next';
import { API, getLogo, getSystemName, showError } from '../../helpers';

// Scope descriptions mapping with icons
const SCOPE_DESCRIPTIONS = {
  openid: {
    name: '身份验证',
    desc: '验证您的身份',
    nameEn: 'Identity',
    descEn: 'Verify your identity',
    icon: IconTickCircle,
    color: 'text-green-500',
  },
  profile: {
    name: '基本信息',
    desc: '访问您的用户名和头像',
    nameEn: 'Profile',
    descEn: 'Access your username and avatar',
    icon: IconUser,
    color: 'text-blue-500',
  },
  email: {
    name: '邮箱地址',
    desc: '访问您的邮箱地址',
    nameEn: 'Email',
    descEn: 'Access your email address',
    icon: IconMail,
    color: 'text-purple-500',
  },
  'balance:read': {
    name: '余额查看',
    desc: '查看您的账户余额',
    nameEn: 'Balance',
    descEn: 'View your account balance',
    icon: IconCoinMoneyStroked,
    color: 'text-yellow-500',
  },
  'usage:read': {
    name: '使用记录',
    desc: '查看您的 API 使用记录',
    nameEn: 'Usage',
    descEn: 'View your API usage records',
    icon: IconHistogram,
    color: 'text-cyan-500',
  },
  'tokens:read': {
    name: '令牌查看',
    desc: '查看您的 API 令牌列表',
    nameEn: 'Tokens (Read)',
    descEn: 'View your API token list',
    icon: IconKey,
    color: 'text-orange-500',
  },
  'tokens:write': {
    name: '令牌管理',
    desc: '创建和删除 API 令牌',
    nameEn: 'Tokens (Write)',
    descEn: 'Create and delete API tokens',
    icon: IconKey,
    color: 'text-red-500',
  },
};

const OAuthConsent = () => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [consentInfo, setConsentInfo] = useState(null);

  const logo = getLogo();
  const systemName = getSystemName();
  const challenge = searchParams.get('consent_challenge');
  const isEnglish = i18n.language === 'en';

  // Fetch consent info on mount
  useEffect(() => {
    if (!challenge) {
      setError(t('缺少 consent_challenge 参数'));
      setLoading(false);
      return;
    }

    const fetchConsentInfo = async () => {
      try {
        const res = await API.get(`/oauth/consent?consent_challenge=${challenge}`);
        const { success, message, data } = res.data;

        if (success) {
          // Check if we need to redirect (already consented or trusted client)
          if (data.redirect_to) {
            window.location.href = data.redirect_to;
            return;
          }
          setConsentInfo(data);
        } else {
          setError(message || t('获取授权信息失败'));
        }
      } catch (err) {
        console.error('Failed to fetch consent info:', err);
        setError(t('获取授权信息失败'));
      } finally {
        setLoading(false);
      }
    };

    fetchConsentInfo();
  }, [challenge, t]);

  // Handle consent approval
  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const res = await API.post('/oauth/consent', {
        consent_challenge: challenge,
        grant_scope: consentInfo?.requested_scope || [],
        remember: true,
      });

      const { success, message, data } = res.data;

      if (success && data.redirect_to) {
        window.location.href = data.redirect_to;
      } else {
        showError(message || t('授权失败'));
      }
    } catch (err) {
      console.error('Consent approval failed:', err);
      showError(t('授权失败，请重试'));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle consent rejection
  const handleReject = async () => {
    setSubmitting(true);
    try {
      const res = await API.post('/oauth/consent/reject', {
        consent_challenge: challenge,
      });

      const { success, message, data } = res.data;

      if (success && data.redirect_to) {
        window.location.href = data.redirect_to;
      } else {
        showError(message || t('操作失败'));
      }
    } catch (err) {
      console.error('Consent rejection failed:', err);
      showError(t('操作失败，请重试'));
    } finally {
      setSubmitting(false);
    }
  };

  // Get scope info
  const getScopeInfo = (scope) => {
    const info = SCOPE_DESCRIPTIONS[scope];
    if (info) {
      return {
        name: isEnglish ? info.nameEn : info.name,
        desc: isEnglish ? info.descEn : info.desc,
        Icon: info.icon,
        color: info.color,
      };
    }
    return {
      name: scope,
      desc: scope,
      Icon: IconTickCircle,
      color: 'text-gray-500',
    };
  };

  // Render loading state
  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-100'>
        <Spin size='large' />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-100'>
        <Card className='max-w-md w-full mx-4 !rounded-2xl'>
          <div className='text-center py-8'>
            <Title heading={4} className='text-red-500 mb-4'>
              {t('错误')}
            </Title>
            <Text>{error}</Text>
          </div>
        </Card>
      </div>
    );
  }

  // Render consent form
  return (
    <div className='relative overflow-hidden bg-gray-100 flex items-center justify-center min-h-screen py-12 px-4'>
      <div className='blur-ball blur-ball-indigo' style={{ top: '-80px', right: '-80px' }} />
      <div className='blur-ball blur-ball-teal' style={{ top: '50%', left: '-120px' }} />

      <div className='w-full max-w-md'>
        <div className='flex items-center justify-center mb-6 gap-2'>
          <img src={logo} alt='Logo' className='h-10 rounded-full' />
          <Title heading={3}>{systemName}</Title>
        </div>

        <Card className='border-0 !rounded-2xl overflow-hidden'>
          <div className='flex flex-col items-center pt-6 pb-4'>
            <Title heading={4} className='text-gray-800 dark:text-gray-200'>
              {consentInfo?.client_name || t('第三方应用')}
            </Title>
            <Text className='text-gray-500 mt-2'>
              {t('请求以下权限')}
            </Text>
          </div>

          <div className='px-4 py-4'>
            {/* Scope list */}
            <div className='border border-gray-200 rounded-xl overflow-hidden'>
              {consentInfo?.requested_scope?.map((scope, index) => {
                const { name, desc, Icon, color } = getScopeInfo(scope);
                const isLast = index === consentInfo.requested_scope.length - 1;

                return (
                  <div
                    key={scope}
                    className={`flex items-start p-4 ${!isLast ? 'border-b border-gray-200' : ''}`}
                  >
                    <Icon className={`${color} mt-0.5 mr-3 flex-shrink-0`} size='large' />
                    <div>
                      <Text className='font-medium text-gray-800 dark:text-gray-200 block'>
                        {name}
                      </Text>
                      <Text className='text-sm text-gray-500'>
                        {desc}
                      </Text>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className='flex gap-3 mt-6'>
              <Button
                theme='light'
                type='tertiary'
                className='flex-1 !rounded-full'
                onClick={handleReject}
                loading={submitting}
              >
                {t('拒绝')}
              </Button>
              <Button
                theme='solid'
                type='primary'
                className='flex-1 !rounded-full'
                onClick={handleApprove}
                loading={submitting}
              >
                {t('授权')}
              </Button>
            </div>

            {/* Notice */}
            <Text className='text-xs text-gray-400 block text-center mt-4'>
              {t('授权后，该应用将获得上述所有权限')}
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OAuthConsent;
