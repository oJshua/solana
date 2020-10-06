import React from "react";
import { PublicKey } from "@solana/web3.js";
import { FetchStatus } from "providers/cache";
import {
  useFetchAccountInfo,
  useAccountInfo,
  Account,
  ProgramData,
} from "providers/accounts";
import { StakeAccountSection } from "components/account/StakeAccountSection";
import { TokenAccountSection } from "components/account/TokenAccountSection";
import { ErrorCard } from "components/common/ErrorCard";
import { LoadingCard } from "components/common/LoadingCard";
import { useCluster, ClusterStatus } from "providers/cluster";
import { NavLink, Redirect, useLocation } from "react-router-dom";
import { clusterPath } from "utils/url";
import { UnknownAccountCard } from "components/account/UnknownAccountCard";
import { OwnedTokensCard } from "components/account/OwnedTokensCard";
import { TransactionHistoryCard } from "components/account/TransactionHistoryCard";
import { TokenHistoryCard } from "components/account/TokenHistoryCard";
import { TokenLargestAccountsCard } from "components/account/TokenLargestAccountsCard";
import { TokenRegistry } from "tokenRegistry";
import { VoteAccountSection } from "components/account/VoteAccountSection";
import { NonceAccountSection } from "components/account/NonceAccountSection";
import { VotesCard } from "components/account/VotesCard";
import { SysvarAccountSection } from "components/account/SysvarAccountSection";
import { SlotHashesCard } from "components/account/SlotHashesCard";
import { StakeHistoryCard } from "components/account/StakeHistoryCard";
import { BlockhashesCard } from "components/account/BlockhashesCard";
import { ConfigAccountSection } from "components/account/ConfigAccountSection";
import { KeysCard } from "components/account/KeysCard";

const TABS_LOOKUP: { [id: string]: Tab } = {
  "spl-token:mint": {
    slug: "largest",
    title: "Distribution",
    path: "/largest",
  },
  vote: {
    slug: "votes",
    title: "Votes",
    path: "/votes",
  },
  "sysvar:recentBlockhashes": {
    slug: "blockhashes",
    title: "Blockhashes",
    path: "/blockhashes",
  },
  "sysvar:slotHashes": {
    slug: "hashes",
    title: "Hashes",
    path: "/hashes",
  },
  "sysvar:stakeHistory": {
    slug: "stake-history",
    title: "Stake History",
    path: "/stake-history",
  },
  "config:validatorInfo": {
    slug: "public-keys",
    title: "Public Keys",
    path: "/public-keys",
  },
};

const TOKEN_TABS_HIDDEN = [
  "spl-token:mint",
  "config",
  "vote",
  "sysvar",
  "config",
];

type Props = { address: string; tab?: string };
export function AccountDetailsPage({ address, tab }: Props) {
  let pubkey: PublicKey | undefined;

  try {
    pubkey = new PublicKey(address);
  } catch (err) {}

  return (
    <div className="container mt-n3">
      <div className="header">
        <div className="header-body">
          <AccountHeader address={address} />
        </div>
      </div>
      {!pubkey ? (
        <ErrorCard text={`Address "${address}" is not valid`} />
      ) : (
        <DetailsSections pubkey={pubkey} tab={tab} />
      )}
    </div>
  );
}

export function AccountHeader({ address }: { address: string }) {
  const { cluster } = useCluster();
  const tokenDetails = TokenRegistry.get(address, cluster);
  if (tokenDetails) {
    return (
      <div className="row align-items-end">
        {tokenDetails.logo && (
          <div className="col-auto">
            <div className="avatar avatar-lg header-avatar-top">
              <img
                src={tokenDetails.logo}
                alt="token logo"
                className="avatar-img rounded-circle border border-4 border-body"
              />
            </div>
          </div>
        )}

        <div className="col mb-3 ml-n3 ml-md-n2">
          <h6 className="header-pretitle">Token</h6>
          <h2 className="header-title">{tokenDetails.name}</h2>
        </div>
      </div>
    );
  }

  return (
    <>
      <h6 className="header-pretitle">Details</h6>
      <h2 className="header-title">Account</h2>
    </>
  );
}

function DetailsSections({ pubkey, tab }: { pubkey: PublicKey; tab?: string }) {
  const fetchAccount = useFetchAccountInfo();
  const address = pubkey.toBase58();
  const info = useAccountInfo(address);
  const { status } = useCluster();
  const location = useLocation();

  // Fetch account on load
  React.useEffect(() => {
    if (!info && status === ClusterStatus.Connected) fetchAccount(pubkey);
  }, [address, status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!info || info.status === FetchStatus.Fetching) {
    return <LoadingCard />;
  } else if (
    info.status === FetchStatus.FetchFailed ||
    info.data?.lamports === undefined
  ) {
    return <ErrorCard retry={() => fetchAccount(pubkey)} text="Fetch Failed" />;
  }

  const account = info.data;
  const data = account?.details?.data;
  const tabs = getTabs(data);

  let moreTab: MoreTabs = "history";
  if (tab && tabs.filter(({ slug }) => slug === tab).length === 0) {
    return <Redirect to={{ ...location, pathname: `/address/${address}` }} />;
  } else if (tab) {
    moreTab = tab as MoreTabs;
  }

  return (
    <>
      {<InfoSection account={account} />}
      {<MoreSection account={account} tab={moreTab} tabs={tabs} />}
    </>
  );
}

function InfoSection({ account }: { account: Account }) {
  const data = account?.details?.data;

  if (data && data.program === "stake") {
    let stakeAccountType, stakeAccount;
    if ("accountType" in data.parsed) {
      stakeAccount = data.parsed;
      stakeAccountType = data.parsed.accountType as any;
    } else {
      stakeAccount = data.parsed.info;
      stakeAccountType = data.parsed.type;
    }

    return (
      <StakeAccountSection
        account={account}
        stakeAccount={stakeAccount}
        activation={data.activation}
        stakeAccountType={stakeAccountType}
      />
    );
  } else if (data && data.program === "spl-token") {
    return <TokenAccountSection account={account} tokenAccount={data.parsed} />;
  } else if (data && data.program === "nonce") {
    return <NonceAccountSection account={account} nonceAccount={data.parsed} />;
  } else if (data && data.program === "vote") {
    return <VoteAccountSection account={account} voteAccount={data.parsed} />;
  } else if (data && data.program === "sysvar") {
    return (
      <SysvarAccountSection account={account} sysvarAccount={data.parsed} />
    );
  } else if (data && data.program === "config") {
    return (
      <ConfigAccountSection account={account} configAccount={data.parsed} />
    );
  } else {
    return <UnknownAccountCard account={account} />;
  }
}

type Tab = {
  slug: MoreTabs;
  title: string;
  path: string;
};

type MoreTabs =
  | "history"
  | "tokens"
  | "largest"
  | "votes"
  | "hashes"
  | "stake-history"
  | "blockhashes"
  | "public-keys";

function MoreSection({
  account,
  tab,
  tabs,
}: {
  account: Account;
  tab: MoreTabs;
  tabs: Tab[];
}) {
  const pubkey = account.pubkey;
  const address = account.pubkey.toBase58();
  const data = account?.details?.data;
  return (
    <>
      <div className="container">
        <div className="header">
          <div className="header-body pt-0">
            <ul className="nav nav-tabs nav-overflow header-tabs">
              {tabs.map(({ title, slug, path }) => (
                <li key={slug} className="nav-item">
                  <NavLink
                    className="nav-link"
                    to={clusterPath(`/address/${address}${path}`)}
                    exact
                  >
                    {title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {tab === "tokens" && (
        <>
          <OwnedTokensCard pubkey={pubkey} />
          <TokenHistoryCard pubkey={pubkey} />
        </>
      )}
      {tab === "history" && <TransactionHistoryCard pubkey={pubkey} />}
      {tab === "largest" && <TokenLargestAccountsCard pubkey={pubkey} />}
      {tab === "votes" && data?.program === "vote" && (
        <VotesCard voteAccount={data.parsed} />
      )}
      {tab === "public-keys" &&
        data?.program === "config" &&
        data.parsed.type === "validatorInfo" && (
          <KeysCard configAccount={data.parsed} />
        )}
      {tab === "hashes" &&
        data?.program === "sysvar" &&
        data.parsed.type === "slotHashes" && (
          <SlotHashesCard sysvarAccount={data.parsed} />
        )}
      {tab === "stake-history" &&
        data?.program === "sysvar" &&
        data.parsed.type === "stakeHistory" && (
          <StakeHistoryCard sysvarAccount={data.parsed} />
        )}
      {tab === "blockhashes" &&
        data?.program === "sysvar" &&
        data.parsed.type === "recentBlockhashes" && (
          <BlockhashesCard sysvarAccount={data.parsed} />
        )}
    </>
  );
}

function getTabs(data?: ProgramData): Tab[] {
  const tabs: Tab[] = [
    {
      slug: "history",
      title: "History",
      path: "",
    },
  ];

  const programTypeKey = [
    data?.program,
    (data?.parsed as { type: any })?.type,
  ].join(":");

  if (data && data.program in TABS_LOOKUP) {
    tabs.push(TABS_LOOKUP[data.program]);
  }

  if (data && programTypeKey in TABS_LOOKUP) {
    tabs.push(TABS_LOOKUP[programTypeKey]);
  }

  if (
    !data ||
    !(
      TOKEN_TABS_HIDDEN.includes(data.program) ||
      TOKEN_TABS_HIDDEN.includes(programTypeKey)
    )
  ) {
    tabs.push({
      slug: "tokens",
      title: "Tokens",
      path: "/tokens",
    });
  }

  return tabs;
}
