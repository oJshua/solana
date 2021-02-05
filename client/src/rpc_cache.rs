use crate::rpc_config::RpcProgramAccountsConfig;
use crate::rpc_response::RpcKeyedAccount;
use std::collections::HashMap;
use std::time::{Duration, SystemTime};

#[derive(Debug, Clone)]
pub struct ProgramAccountsCache {
    size: usize,
    duration: u64,
    cache: HashMap<ProgramAccountsCacheKey, ProgramAccountsCacheValue>,
}

#[derive(Debug, PartialEq, Eq, Hash, Clone)]
struct ProgramAccountsCacheKey {
    pub program_id: String,
    pub config: Option<RpcProgramAccountsConfig>,
}

#[derive(Debug, Clone)]
struct ProgramAccountsCacheValue {
    accounts: Vec<RpcKeyedAccount>,
    time: SystemTime,
}

impl ProgramAccountsCache {
    pub fn new(size: usize, duration: u64) -> Self {
        Self {
            size,
            duration,
            cache: HashMap::new(),
        }
    }

    pub fn get_program_accounts(
        &self,
        program_id: &String,
        config: &Option<RpcProgramAccountsConfig>,
    ) -> Option<Vec<RpcKeyedAccount>> {
        let cache_key = ProgramAccountsCacheKey {
            program_id: program_id.clone(),
            config: config.clone(),
        };

        self.cache.get(&cache_key).map(|value| {
            value.time.elapsed().ok().map(|elapsed| {
                if elapsed < Duration::from_secs(self.duration) {
                    Some(value.accounts.clone())
                } else {
                    None
                }
            })?
        })?
    }

    pub fn cache_program_accounts(
        &mut self,
        program_id: &String,
        config: &Option<RpcProgramAccountsConfig>,
        accounts: &Vec<RpcKeyedAccount>,
    ) {
        if self.cache.len() >= self.size {
            self.evict();
        }

        let cache_key = ProgramAccountsCacheKey {
            program_id: program_id.clone(),
            config: config.clone(),
        };

        if self.cache.len() < self.size {
            self.cache.insert(
                cache_key,
                ProgramAccountsCacheValue {
                    accounts: accounts.clone(),
                    time: SystemTime::now(),
                },
            );
        }
    }

    fn evict(&mut self) {
        let duration = Duration::from_secs(self.duration);
        self.cache.retain(|_key, value| {
            if let Ok(elapsed) = value.time.elapsed() {
                elapsed < duration
            } else {
                false
            }
        });
    }
}

#[test]
fn test_cache_stays_within_size_limit() {
    let mut cache = ProgramAccountsCache::new(2, 30);

    let config = Some(RpcProgramAccountsConfig {
        filters: None,
        account_config: crate::rpc_config::RpcAccountInfoConfig {
            encoding: None,
            data_slice: None,
            commitment: None,
        },
    });

    let accounts: Vec<RpcKeyedAccount> = Vec::new();

    cache.cache_program_accounts(
        &String::from("He6B2t1kftPjPvMro9e73Vi24rQx2cJry82igBrNhn85"),
        &config,
        &accounts,
    );
    cache.cache_program_accounts(
        &String::from("He6B2t1kftPjPvMro9e73Vi24rQx2cJry82igBrNhn84"),
        &config,
        &accounts,
    );
    cache.cache_program_accounts(
        &String::from("He6B2t1kftPjPvMro9e73Vi24rQx2cJry82igBrNhn83"),
        &config,
        &accounts,
    );

    assert_eq!(cache.cache.len(), 2);
}

#[test]
fn test_old_entries_get_evicted() {
    let mut cache = ProgramAccountsCache::new(2, 1);

    let config = Some(RpcProgramAccountsConfig {
        filters: None,
        account_config: crate::rpc_config::RpcAccountInfoConfig {
            encoding: None,
            data_slice: None,
            commitment: None,
        },
    });

    let accounts: Vec<RpcKeyedAccount> = Vec::new();

    cache.cache_program_accounts(
        &String::from("He6B2t1kftPjPvMro9e73Vi24rQx2cJry82igBrNhn85"),
        &config,
        &accounts,
    );
    cache.cache_program_accounts(
        &String::from("He6B2t1kftPjPvMro9e73Vi24rQx2cJry82igBrNhn84"),
        &config,
        &accounts,
    );
    std::thread::sleep(Duration::from_secs(1));
    cache.cache_program_accounts(
        &String::from("He6B2t1kftPjPvMro9e73Vi24rQx2cJry82igBrNhn83"),
        &config,
        &accounts,
    );
    assert_eq!(cache.cache.len(), 1);
}

#[test]
fn test_entries_hashed_the_same() {
    let mut cache = ProgramAccountsCache::new(2, 2);

    let config = Some(RpcProgramAccountsConfig {
        filters: None,
        account_config: crate::rpc_config::RpcAccountInfoConfig {
            encoding: None,
            data_slice: None,
            commitment: None,
        },
    });

    let accounts: Vec<RpcKeyedAccount> = vec![];

    cache.cache_program_accounts(
        &String::from("He6B2t1kftPjPvMro9e73Vi24rQx2cJry82igBrNhn85"),
        &config,
        &accounts,
    );
    cache.cache_program_accounts(
        &String::from("He6B2t1kftPjPvMro9e73Vi24rQx2cJry82igBrNhn85"),
        &config,
        &accounts,
    );
    assert_eq!(cache.cache.len(), 1);
}
