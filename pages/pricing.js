import { Card, Layout, Page, ResourceList, Avatar, TextStyle } from "@shopify/polaris";

const Pricing = () => (
  <Page>
    <Layout>
      <Card>
        <ResourceList
          showHeader
          items={[
            {
              id: 341,
              url: 'customers/341',
              name: 'Mae Jemison',
              location: 'Decatur, USA',
            },
            {
              id: 256,
              url: 'customers/256',
              name: 'Ellen Ochoa',
              location: 'Los Angeles, USA',
            },
          ]}
          renderItem={(item) => {
            const {id, url, name, location} = item;
            const media = <Avatar customer size="medium" name={name} />;

            return (
              <ResourceList.Item id={id} url={url} media={media}>
                <h3>
                  <TextStyle variation="strong">{name}</TextStyle>
                </h3>
                <div>{location}</div>
              </ResourceList.Item>
            );
          }}
        />
      </Card>
    </Layout>
  </Page>
);
export default Pricing;
