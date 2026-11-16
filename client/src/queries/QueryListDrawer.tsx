import queryString from 'query-string';
import React, { useCallback, useEffect, useState } from 'react';
import { useElementSize } from '../utilities/use-element-size';
import { Link } from 'react-router';
import { List, RowComponentProps } from 'react-window';
import { useInfiniteLoader } from 'react-window-infinite-loader';
import { useDebounce } from 'use-debounce';
import DeleteConfirmButton from '../common/DeleteConfirmButton';
import Drawer from '../common/Drawer';
import ErrorBlock from '../common/ErrorBlock';
import InfoBlock from '../common/InfoBlock';
import Input from '../common/Input';
import ListItem from '../common/ListItem';
import message from '../common/message';
import MultiSelect, { MultiSelectItem } from '../common/MultiSelect';
import Select from '../common/Select';
import SpinKitCube from '../common/SpinKitCube';
import { Query } from '../types';
import { api } from '../utilities/api';
import styles from './QueryList.module.css';
import QueryPreview from './QueryPreview';

const SHARED = 'SHARED';
const MY_QUERIES = 'MY_QUERIES';
const ALL = 'ALL';

type Params = Record<
  string,
  string | number | boolean | string[] | null | undefined
>;

type Props = {
  visible?: boolean;
  onClose: (...args: any[]) => any;
};

interface QueryRowProps {
  queries: Query[];
  onPreview: (query: Query | null) => void;
  onOpen: () => void;
  onDelete: (queryId: string) => void;
}

function QueryRow({
  ariaAttributes,
  index,
  style,
  queries,
  onPreview,
  onOpen,
  onDelete,
}: RowComponentProps<QueryRowProps>) {
  const query = queries[index];
  const queryUrl = `/queries/${query.id}`;

  return (
    <ListItem
      {...ariaAttributes}
      key={query.id}
      className={styles.ListItem}
      onMouseEnter={() => onPreview(query)}
      onMouseLeave={() => onPreview(null)}
      style={style}
    >
      <Link
        className={`${styles.queryLink} truncate`}
        to={queryUrl}
        onClick={onOpen}
      >
        {query.name}
      </Link>
      <div className={styles.listItemActions}>
        <DeleteConfirmButton
          icon
          key="del"
          confirmMessage={`Delete ${query.name}`}
          onConfirm={() => {
            onDelete(query.id);
          }}
          disabled={!query.canDelete}
        >
          Delete
        </DeleteConfirmButton>
      </div>
    </ListItem>
  );
}

function QueryListDrawer({ onClose, visible }: Props) {
  const [preview, setPreview] = useState<Query | null>(null);
  const [search, setSearch] = useState('');
  const [searchTags, setSearchTags] = useState<Array<any>>([]);
  const [creatorSearch, setCreatorSearch] = useState(ALL);
  const [sort, setSort] = useState('SAVE_DATE');
  const [connectionId, setConnectionId] = useState('');
  const [measureRef, dimensions] = useElementSize();
  const [debouncedSearch] = useDebounce(search, 400);

  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(false);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined | null>(null);

  let params: Params = {
    limit: 20,
  };

  if (sort === 'SAVE_DATE') {
    params.sortBy = '-updatedAt';
  } else {
    params.sortBy = '+name';
  }

  if (creatorSearch === MY_QUERIES) {
    params.ownedByUser = true;
  } else if (creatorSearch === SHARED) {
    params.ownedByUser = false;
  }

  if (debouncedSearch) {
    params.search = debouncedSearch;
  }

  if (connectionId) {
    params.connectionId = connectionId;
  }

  if (searchTags && searchTags.length > 0) {
    params.tags = searchTags.map((tag) => tag.id).sort();
  }

  // NOTE - this is left as raw api.get fetch and url creation here instead of api
  // because of this gradual load-more appoach
  // The api util does not have support for this complexity yet
  // This will have to follow a different pattern
  const initialUrl =
    '/api/queries?' + queryString.stringify(params, { arrayFormat: 'bracket' });

  const getQueries = useCallback(
    (url: string) => {
      setLoading(true);
      // This cannot use SWR at this time
      // as we need to use links and manage state
      return api.get(url).then((response) => {
        const { data, links, error } = response;
        setLoading(false);
        setError(error);
        if (links && links.next) {
          setNext(links.next);
        } else {
          setNext(null);
        }
        if (url === initialUrl) {
          setQueries(data);
        } else {
          setQueries((queries) => queries.concat(data));
        }
      });
    },
    [initialUrl],
  );

  // (re)fetch queries when visible
  // New queries may have been added since last viewing
  useEffect(() => {
    if (visible) {
      getQueries(initialUrl);
    }
  }, [visible, initialUrl, getQueries]);

  let { data: tagData } = api.useTags(true);
  const tags = tagData || [];

  let { data: connectionsData } = api.useConnections();
  const connections = connectionsData || [];

  const deleteQuery = async (queryId: string) => {
    const { error } = await api.deleteQuery(queryId);
    if (error) {
      return message.error(error);
    }

    setQueries((queries) => queries.filter((q) => q.id !== queryId));
    setPreview(null);
  };

  function handleClose() {
    setPreview(null);
    onClose();
  }

  const loadMore = (startIndex: number, stopIndex: number) => {
    if (!loading && next) {
      return getQueries(next);
    }
    return Promise.resolve();
  };

  // Row count is open-ended; the server returns a next link while more exist
  const onRowsRendered = useInfiniteLoader({
    isRowLoaded: (index: number) => index < queries.length,
    rowCount: 1000,
    loadMoreRows: loadMore,
  });

  return (
    <Drawer
      title={'Queries'}
      visible={visible}
      width="600px"
      onClose={handleClose}
      placement="left"
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className={styles.filterContainer}>
          <div className={styles.filterRow}>
            <Select
              style={{ width: 140, marginRight: 8, flex: '0 0 auto' }}
              value={creatorSearch}
              onChange={(e: any) => setCreatorSearch(e.target.value)}
            >
              <option value={MY_QUERIES}>My queries</option>
              <option value={SHARED}>Shared with me</option>
              <option value={ALL}>All queries</option>
            </Select>
            <Select
              style={{ marginRight: 8 }}
              value={connectionId}
              onChange={(e: any) => setConnectionId(e.target.value)}
            >
              <option value="">All connections</option>
              {connections.map((connection: any) => {
                return (
                  <option key={connection.id} value={connection.id}>
                    {connection.name}
                  </option>
                );
              })}
            </Select>

            <Select
              style={{ width: 170, flex: '0 0 auto' }}
              value={sort}
              onChange={(e: any) => setSort(e.target.value)}
            >
              <option value="SAVE_DATE">Order by last saved</option>
              <option value="NAME">Order by name</option>
            </Select>
          </div>
          <div className={styles.filterRow}>
            <div style={{ flex: '1 1 auto', width: '50%' }}>
              <Input
                style={{ height: 36 }}
                placeholder="search"
                value={search}
                onChange={(e: any) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ width: 8 }} />
            <div style={{ flex: '1 1 auto', width: '50%' }}>
              <MultiSelect
                selectedItems={searchTags}
                options={tags.map((t: any) => ({
                  id: t,
                  name: t,
                }))}
                onChange={(items: MultiSelectItem[]) => setSearchTags(items)}
                placeholder="tags"
              />
            </div>
          </div>
        </div>

        <div
          ref={measureRef}
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
          }}
        >
          {loading && queries.length === 0 && (
            <div className="h-100 w-100 flex-center">
              <SpinKitCube />
            </div>
          )}
          {error && <ErrorBlock>Error getting queries</ErrorBlock>}
          {!error && !loading && queries.length === 0 && (
            <div style={{ height: 150, width: '100%' }}>
              <InfoBlock>No queries found</InfoBlock>
            </div>
          )}
          {!error && queries.length > 0 && (
            <List
              // position absolute takes list out of flow,
              // preventing some weird measuring behavior in Firefox
              style={{
                position: 'absolute',
                height: Math.max(0, dimensions.height),
                width: Math.max(0, dimensions.width),
              }}
              onRowsRendered={onRowsRendered}
              rowCount={queries.length}
              rowHeight={48}
              rowComponent={QueryRow}
              rowProps={{
                queries,
                onPreview: setPreview,
                onOpen: handleClose,
                onDelete: deleteQuery,
              }}
              overscanCount={2}
            />
          )}
        </div>

        <QueryPreview key={preview && preview.id} query={preview} />
      </div>
    </Drawer>
  );
}

export default React.memo(QueryListDrawer);
