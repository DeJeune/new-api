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

import React, { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Tag,
  Typography,
  Divider,
  Space,
  TextArea,
  Banner,
} from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { API } from '../../helpers/api';

const { Title, Text } = Typography;

const EndpointTestCard = ({
  method,
  endpoint,
  description,
  inputs,
  onTest,
  result,
  loading,
  onClear,
}) => {
  const { t } = useTranslation();

  const methodColors = {
    GET: 'blue',
    POST: 'green',
    DELETE: 'red',
  };

  return (
    <Card
      style={{ marginBottom: 16 }}
      headerStyle={{ padding: '12px 16px' }}
      bodyStyle={{ padding: '16px' }}
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag color={methodColors[method]} size='large'>
            {method}
          </Tag>
          <Text strong style={{ fontFamily: 'monospace' }}>
            {endpoint}
          </Text>
        </div>
      }
    >
      <Text type='secondary' style={{ display: 'block', marginBottom: 12 }}>
        {description}
      </Text>

      {inputs}

      <Space style={{ marginTop: 12 }}>
        <Button theme='solid' onClick={onTest} loading={loading}>
          {t('Test')}
        </Button>
        <Button onClick={onClear}>{t('Clear')}</Button>
      </Space>

      {result && (
        <div style={{ marginTop: 16 }}>
          <Divider margin={12} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <Tag
              color={
                result.status >= 200 && result.status < 300 ? 'green' : 'red'
              }
            >
              {result.status}
            </Tag>
            <Text type='secondary'>{result.responseTime}ms</Text>
          </div>
          <TextArea
            value={JSON.stringify(result.data, null, 2)}
            autosize
            readonly
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>
      )}
    </Card>
  );
};

const OAuthProviderTest = () => {
  const { t } = useTranslation();

  // OAuth flow initiation state
  const [hydraUrl, setHydraUrl] = useState('http://localhost:4444');
  const [clientId, setClientId] = useState('test-client');
  const [clientSecret, setClientSecret] = useState('test-secret');
  const [redirectUri, setRedirectUri] = useState('http://localhost:3000/oauth/callback');
  const [scope, setScope] = useState('openid profile balance:read usage:read tokens:read tokens:write');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerResult, setRegisterResult] = useState(null);

  // Login flow state
  const [loginChallenge, setLoginChallenge] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFACode, setTwoFACode] = useState('');

  // Consent flow state
  const [consentChallenge, setConsentChallenge] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Logout flow state
  const [logoutChallenge, setLogoutChallenge] = useState('');

  // Results state
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const makeRequest = async (key, config) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    const startTime = Date.now();

    try {
      const response = await API({
        ...config,
        validateStatus: () => true,
      });

      setResults((prev) => ({
        ...prev,
        [key]: {
          status: response.status,
          data: response.data,
          responseTime: Date.now() - startTime,
        },
      }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [key]: {
          status: error.response?.status || 0,
          data: error.response?.data || { error: error.message },
          responseTime: Date.now() - startTime,
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const clearResult = (key) => {
    setResults((prev) => {
      const newResults = { ...prev };
      delete newResults[key];
      return newResults;
    });
  };

  const startOAuthFlow = () => {
    const state = Math.random().toString(36).substring(7);
    const authUrl = `${hydraUrl}/oauth2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${state}`;
    window.open(authUrl, '_blank');
  };

  const registerClient = async () => {
    setRegisterLoading(true);
    const startTime = Date.now();
    try {
      const response = await API({
        method: 'POST',
        url: '/oauth/admin/clients',
        data: {
          client_id: clientId,
          client_secret: clientSecret,
          client_name: clientId,
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          redirect_uris: [redirectUri],
          scope: scope,
          token_endpoint_auth_method: 'client_secret_post',
        },
        validateStatus: () => true,
      });
      setRegisterResult({
        status: response.status,
        data: response.data,
        responseTime: Date.now() - startTime,
      });
    } catch (error) {
      setRegisterResult({
        status: error.response?.status || 0,
        data: error.response?.data || { error: error.message },
        responseTime: Date.now() - startTime,
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div>
      {/* Start OAuth Flow Section */}
      <Banner
        type='info'
        description={t(
          'To get a login_challenge, you need to initiate an OAuth flow. Click the button below to start the flow in a new window. The login_challenge will appear in the URL when redirected to the login page.',
        )}
        style={{ marginBottom: 16, marginTop: 16 }}
      />

      <Card style={{ marginBottom: 24 }}>
        <Title heading={5} style={{ marginBottom: 12 }}>
          {t('OAuth Client Configuration')}
        </Title>
        <Space vertical align='start' style={{ width: '100%' }}>
          <Input
            prefix={t('Hydra URL')}
            value={hydraUrl}
            onChange={setHydraUrl}
            style={{ width: '100%' }}
          />
          <Input
            prefix={t('Client ID')}
            value={clientId}
            onChange={setClientId}
            style={{ width: '100%' }}
          />
          <Input
            prefix={t('Client Secret')}
            value={clientSecret}
            onChange={setClientSecret}
            style={{ width: '100%' }}
          />
          <Input
            prefix={t('Redirect URI')}
            value={redirectUri}
            onChange={setRedirectUri}
            style={{ width: '100%' }}
          />
          <Input
            prefix={t('Scopes')}
            value={scope}
            onChange={setScope}
            style={{ width: '100%' }}
          />
          <Space>
            <Button
              theme='solid'
              type='secondary'
              onClick={registerClient}
              loading={registerLoading}
            >
              {t('Register Client')}
            </Button>
            <Button theme='solid' type='primary' onClick={startOAuthFlow}>
              {t('Start OAuth Flow')}
            </Button>
          </Space>
        </Space>

        {registerResult && (
          <div style={{ marginTop: 16 }}>
            <Divider margin={12} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Tag
                color={
                  registerResult.status >= 200 && registerResult.status < 300
                    ? 'green'
                    : registerResult.status === 409
                    ? 'orange'
                    : 'red'
                }
              >
                {registerResult.status}
              </Tag>
              <Text type='secondary'>{registerResult.responseTime}ms</Text>
              {registerResult.status === 409 && (
                <Text type='warning'>{t('Client already exists')}</Text>
              )}
            </div>
            <TextArea
              value={JSON.stringify(registerResult.data, null, 2)}
              autosize
              readonly
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
        )}
      </Card>

      <Divider margin={24} />
      {/* Login Flow Section */}
      <Title heading={4} style={{ marginTop: 16, marginBottom: 12 }}>
        {t('Login Flow')}
      </Title>
      <Text type='secondary' style={{ display: 'block', marginBottom: 16 }}>
        {t(
          'Test the OAuth login flow endpoints. Start by getting a login_challenge from Hydra.',
        )}
      </Text>

      {/* GET /oauth/login */}
      <EndpointTestCard
        method='GET'
        endpoint='/oauth/login'
        description={t('Get login request information from Hydra')}
        inputs={
          <Input
            placeholder='login_challenge'
            value={loginChallenge}
            onChange={setLoginChallenge}
            style={{ fontFamily: 'monospace' }}
          />
        }
        onTest={() =>
          makeRequest('getLogin', {
            method: 'GET',
            url: `/oauth/login?login_challenge=${loginChallenge}`,
          })
        }
        onClear={() => clearResult('getLogin')}
        result={results.getLogin}
        loading={loading.getLogin}
      />

      {/* POST /oauth/login */}
      <EndpointTestCard
        method='POST'
        endpoint='/oauth/login'
        description={t('Submit username and password for OAuth login')}
        inputs={
          <Space vertical align='start' style={{ width: '100%' }}>
            <Input
              placeholder='login_challenge'
              value={loginChallenge}
              onChange={setLoginChallenge}
              style={{ fontFamily: 'monospace', width: '100%' }}
            />
            <Input
              placeholder='username'
              value={username}
              onChange={setUsername}
              style={{ width: '100%' }}
            />
            <Input
              placeholder='password'
              type='password'
              value={password}
              onChange={setPassword}
              style={{ width: '100%' }}
            />
          </Space>
        }
        onTest={() =>
          makeRequest('postLogin', {
            method: 'POST',
            url: `/oauth/login?login_challenge=${loginChallenge}`,
            data: { username, password },
          })
        }
        onClear={() => clearResult('postLogin')}
        result={results.postLogin}
        loading={loading.postLogin}
      />

      {/* POST /oauth/login/2fa */}
      <EndpointTestCard
        method='POST'
        endpoint='/oauth/login/2fa'
        description={t('Submit 2FA code to complete login')}
        inputs={
          <Space vertical align='start' style={{ width: '100%' }}>
            <Input
              placeholder='login_challenge'
              value={loginChallenge}
              onChange={setLoginChallenge}
              style={{ fontFamily: 'monospace', width: '100%' }}
            />
            <Input
              placeholder='2FA code'
              value={twoFACode}
              onChange={setTwoFACode}
              style={{ width: '100%' }}
            />
          </Space>
        }
        onTest={() =>
          makeRequest('postLogin2FA', {
            method: 'POST',
            url: `/oauth/login/2fa?login_challenge=${loginChallenge}`,
            data: { code: twoFACode },
          })
        }
        onClear={() => clearResult('postLogin2FA')}
        result={results.postLogin2FA}
        loading={loading.postLogin2FA}
      />

      <Divider margin={24} />

      {/* Consent Flow Section */}
      <Title heading={4} style={{ marginBottom: 12 }}>
        {t('Consent Flow')}
      </Title>
      <Text type='secondary' style={{ display: 'block', marginBottom: 16 }}>
        {t(
          'Test the OAuth consent flow endpoints. Get a consent_challenge after successful login.',
        )}
      </Text>

      {/* GET /oauth/consent */}
      <EndpointTestCard
        method='GET'
        endpoint='/oauth/consent'
        description={t('Get consent request information from Hydra')}
        inputs={
          <Input
            placeholder='consent_challenge'
            value={consentChallenge}
            onChange={setConsentChallenge}
            style={{ fontFamily: 'monospace' }}
          />
        }
        onTest={() =>
          makeRequest('getConsent', {
            method: 'GET',
            url: `/oauth/consent?consent_challenge=${consentChallenge}`,
          })
        }
        onClear={() => clearResult('getConsent')}
        result={results.getConsent}
        loading={loading.getConsent}
      />

      {/* POST /oauth/consent */}
      <EndpointTestCard
        method='POST'
        endpoint='/oauth/consent'
        description={t('Grant consent for the requested scopes')}
        inputs={
          <Input
            placeholder='consent_challenge'
            value={consentChallenge}
            onChange={setConsentChallenge}
            style={{ fontFamily: 'monospace' }}
          />
        }
        onTest={() =>
          makeRequest('postConsent', {
            method: 'POST',
            url: `/oauth/consent?consent_challenge=${consentChallenge}`,
          })
        }
        onClear={() => clearResult('postConsent')}
        result={results.postConsent}
        loading={loading.postConsent}
      />

      {/* POST /oauth/consent/reject */}
      <EndpointTestCard
        method='POST'
        endpoint='/oauth/consent/reject'
        description={t('Reject the consent request')}
        inputs={
          <Space vertical align='start' style={{ width: '100%' }}>
            <Input
              placeholder='consent_challenge'
              value={consentChallenge}
              onChange={setConsentChallenge}
              style={{ fontFamily: 'monospace', width: '100%' }}
            />
            <Input
              placeholder='reason (optional)'
              value={rejectReason}
              onChange={setRejectReason}
              style={{ width: '100%' }}
            />
          </Space>
        }
        onTest={() =>
          makeRequest('postConsentReject', {
            method: 'POST',
            url: `/oauth/consent/reject?consent_challenge=${consentChallenge}`,
            data: { reason: rejectReason },
          })
        }
        onClear={() => clearResult('postConsentReject')}
        result={results.postConsentReject}
        loading={loading.postConsentReject}
      />

      <Divider margin={24} />

      {/* Logout Flow Section */}
      <Title heading={4} style={{ marginBottom: 12 }}>
        {t('Logout Flow')}
      </Title>
      <Text type='secondary' style={{ display: 'block', marginBottom: 16 }}>
        {t('Test the OAuth logout endpoint.')}
      </Text>

      {/* GET /oauth/logout */}
      <EndpointTestCard
        method='GET'
        endpoint='/oauth/logout'
        description={t('Handle OAuth logout request')}
        inputs={
          <Input
            placeholder='logout_challenge'
            value={logoutChallenge}
            onChange={setLogoutChallenge}
            style={{ fontFamily: 'monospace' }}
          />
        }
        onTest={() =>
          makeRequest('getLogout', {
            method: 'GET',
            url: `/oauth/logout?logout_challenge=${logoutChallenge}`,
          })
        }
        onClear={() => clearResult('getLogout')}
        result={results.getLogout}
        loading={loading.getLogout}
      />
    </div>
  );
};

export default OAuthProviderTest;
