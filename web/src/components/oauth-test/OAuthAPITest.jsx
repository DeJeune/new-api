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
import axios from 'axios';

const { Title, Text } = Typography;

const EndpointTestCard = ({
  method,
  endpoint,
  description,
  scope,
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color={methodColors[method]} size='large'>
              {method}
            </Tag>
            <Text strong style={{ fontFamily: 'monospace' }}>
              {endpoint}
            </Text>
          </div>
          {scope && (
            <Tag color='purple' size='small'>
              {t('Scope')}: {scope}
            </Tag>
          )}
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

const OAuthAPITest = () => {
  const { t } = useTranslation();

  // Bearer token state
  const [bearerToken, setBearerToken] = useState('');

  // Token creation state
  const [tokenName, setTokenName] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState('');

  // Token deletion state
  const [tokenId, setTokenId] = useState('');

  // Results state
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const createAxiosInstance = () => {
    return axios.create({
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      validateStatus: () => true,
    });
  };

  const makeRequest = async (key, config) => {
    if (!bearerToken) {
      setResults((prev) => ({
        ...prev,
        [key]: {
          status: 0,
          data: { error: 'Bearer token is required' },
          responseTime: 0,
        },
      }));
      return;
    }

    setLoading((prev) => ({ ...prev, [key]: true }));
    const startTime = Date.now();

    try {
      const instance = createAxiosInstance();
      const response = await instance(config);

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

  return (
    <div>
      {/* Bearer Token Input */}
      <Banner
        type='info'
        description={t(
          'Enter the OAuth Bearer token obtained from Hydra to test the API endpoints.',
        )}
        style={{ marginBottom: 16, marginTop: 16 }}
      />

      <Card style={{ marginBottom: 24 }}>
        <Title heading={5} style={{ marginBottom: 12 }}>
          {t('Bearer Token')}
        </Title>
        <TextArea
          placeholder={t('Paste your OAuth access token here')}
          value={bearerToken}
          onChange={setBearerToken}
          autosize={{ minRows: 2, maxRows: 4 }}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      </Card>

      {/* User Info Section */}
      <Title heading={4} style={{ marginBottom: 12 }}>
        {t('User Info')}
      </Title>

      {/* GET /api/v1/oauth/userinfo */}
      <EndpointTestCard
        method='GET'
        endpoint='/api/v1/oauth/userinfo'
        description={t(
          'Get user information based on requested OpenID scopes',
        )}
        scope='openid / profile'
        inputs={null}
        onTest={() =>
          makeRequest('getUserInfo', {
            method: 'GET',
            url: '/api/v1/oauth/userinfo',
          })
        }
        onClear={() => clearResult('getUserInfo')}
        result={results.getUserInfo}
        loading={loading.getUserInfo}
      />

      <Divider margin={24} />

      {/* Balance Section */}
      <Title heading={4} style={{ marginBottom: 12 }}>
        {t('Balance')}
      </Title>

      {/* GET /api/v1/oauth/balance */}
      <EndpointTestCard
        method='GET'
        endpoint='/api/v1/oauth/balance'
        description={t('Get user balance information')}
        scope='balance:read'
        inputs={null}
        onTest={() =>
          makeRequest('getBalance', {
            method: 'GET',
            url: '/api/v1/oauth/balance',
          })
        }
        onClear={() => clearResult('getBalance')}
        result={results.getBalance}
        loading={loading.getBalance}
      />

      <Divider margin={24} />

      {/* Usage Section */}
      <Title heading={4} style={{ marginBottom: 12 }}>
        {t('Usage')}
      </Title>

      {/* GET /api/v1/oauth/usage */}
      <EndpointTestCard
        method='GET'
        endpoint='/api/v1/oauth/usage'
        description={t('Get usage statistics for the current period')}
        scope='usage:read'
        inputs={null}
        onTest={() =>
          makeRequest('getUsage', {
            method: 'GET',
            url: '/api/v1/oauth/usage',
          })
        }
        onClear={() => clearResult('getUsage')}
        result={results.getUsage}
        loading={loading.getUsage}
      />

      <Divider margin={24} />

      {/* Tokens Section */}
      <Title heading={4} style={{ marginBottom: 12 }}>
        {t('API Tokens')}
      </Title>

      {/* GET /api/v1/oauth/tokens */}
      <EndpointTestCard
        method='GET'
        endpoint='/api/v1/oauth/tokens'
        description={t('List all API tokens for the user')}
        scope='tokens:read'
        inputs={null}
        onTest={() =>
          makeRequest('getTokens', {
            method: 'GET',
            url: '/api/v1/oauth/tokens',
          })
        }
        onClear={() => clearResult('getTokens')}
        result={results.getTokens}
        loading={loading.getTokens}
      />

      {/* POST /api/v1/oauth/tokens */}
      <EndpointTestCard
        method='POST'
        endpoint='/api/v1/oauth/tokens'
        description={t('Create a new API token')}
        scope='tokens:write'
        inputs={
          <Space vertical align='start' style={{ width: '100%' }}>
            <Input
              placeholder={t('Token name')}
              value={tokenName}
              onChange={setTokenName}
              style={{ width: '100%' }}
            />
            <Input
              placeholder={t('Expiry (optional, e.g., 2024-12-31)')}
              value={tokenExpiry}
              onChange={setTokenExpiry}
              style={{ width: '100%' }}
            />
          </Space>
        }
        onTest={() =>
          makeRequest('createToken', {
            method: 'POST',
            url: '/api/v1/oauth/tokens',
            data: {
              name: tokenName,
              ...(tokenExpiry && { expired_time: tokenExpiry }),
            },
          })
        }
        onClear={() => clearResult('createToken')}
        result={results.createToken}
        loading={loading.createToken}
      />

      {/* DELETE /api/v1/oauth/tokens/:id */}
      <EndpointTestCard
        method='DELETE'
        endpoint='/api/v1/oauth/tokens/:id'
        description={t('Delete an API token by ID')}
        scope='tokens:write'
        inputs={
          <Input
            placeholder={t('Token ID')}
            value={tokenId}
            onChange={setTokenId}
            style={{ width: '100%' }}
          />
        }
        onTest={() =>
          makeRequest('deleteToken', {
            method: 'DELETE',
            url: `/api/v1/oauth/tokens/${tokenId}`,
          })
        }
        onClear={() => clearResult('deleteToken')}
        result={results.deleteToken}
        loading={loading.deleteToken}
      />
    </div>
  );
};

export default OAuthAPITest;
