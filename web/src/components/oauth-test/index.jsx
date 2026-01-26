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
import { Layout, TabPane, Tabs, Typography } from '@douyinfe/semi-ui';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, Server } from 'lucide-react';
import OAuthProviderTest from './OAuthProviderTest';
import OAuthAPITest from './OAuthAPITest';

const { Title } = Typography;

const OAuthTestComponent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [tabActiveKey, setTabActiveKey] = useState('provider');

  const panes = [
    {
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <KeyRound size={18} />
          {t('OAuth Provider Flow')}
        </span>
      ),
      content: <OAuthProviderTest />,
      itemKey: 'provider',
    },
    {
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Server size={18} />
          {t('OAuth API Endpoints')}
        </span>
      ),
      content: <OAuthAPITest />,
      itemKey: 'api',
    },
  ];

  const onChangeTab = (key) => {
    setTabActiveKey(key);
    navigate(`?tab=${key}`);
  };

  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      setTabActiveKey(tab);
    }
  }, [location.search]);

  return (
    <Layout>
      <Layout.Content>
        <Title heading={3} style={{ marginBottom: 16 }}>
          {t('OAuth Test Console')}
        </Title>
        <Tabs
          type='card'
          activeKey={tabActiveKey}
          onChange={(key) => onChangeTab(key)}
        >
          {panes.map((pane) => (
            <TabPane itemKey={pane.itemKey} tab={pane.tab} key={pane.itemKey}>
              {tabActiveKey === pane.itemKey && pane.content}
            </TabPane>
          ))}
        </Tabs>
      </Layout.Content>
    </Layout>
  );
};

export default OAuthTestComponent;
