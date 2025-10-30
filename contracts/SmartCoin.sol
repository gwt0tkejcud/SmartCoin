// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, externalEuint64, euint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialStablecoin - FHE-powered stablecoin with encrypted balances
/// @notice Implements encrypted balance transfers using Zama's FHE technology
contract ConfidentialStablecoin is SepoliaConfig {
    string public name = "Confidential USD";
    string public symbol = "cUSD";
    uint8 public constant decimals = 6;

    address public owner;
    euint64 private totalSupplyEncrypted;

    // Encrypted balances mapping
    mapping(address => euint64) private _balances;

    // KYC allowlist
    mapping(address => bool) public isAllowed;

    // Faucet settings
    uint64 public faucetAmount = 1000 * 10**6; // 1000 cUSD
    uint256 public faucetCooldown = 24 hours;
    mapping(address => uint256) public lastFaucetClaim;

    event Mint(address indexed to, uint64 amount);
    event Burn(address indexed from, uint64 amount);
    event Transfer(address indexed from, address indexed to);
    event AllowlistUpdated(address indexed user, bool allowed);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event FaucetClaimed(address indexed user, uint64 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAllowed(address user) {
        require(isAllowed[user], "Not allowed");
        _;
    }

    constructor() {
        owner = msg.sender;
        isAllowed[msg.sender] = true;

        // Initialize total supply to 0
        totalSupplyEncrypted = FHE.asEuint64(0);
        FHE.allowThis(totalSupplyEncrypted);
    }

    /// @notice Add or remove user from allowlist (KYC)
    function setAllowed(address user, bool allowed) external onlyOwner {
        isAllowed[user] = allowed;
        emit AllowlistUpdated(user, allowed);
    }

    /// @notice Get encrypted balance of a user
    function balanceOf(address user) external view returns (euint64) {
        return _balances[user];
    }

    /// @notice Mint tokens to a user (owner only)
    function mint(address to, uint64 amount) external onlyOwner onlyAllowed(to) {
        // Add amount to encrypted balance
        euint64 mintAmount = FHE.asEuint64(amount);
        _balances[to] = FHE.add(_balances[to], mintAmount);
        totalSupplyEncrypted = FHE.add(totalSupplyEncrypted, mintAmount);

        // Set permissions
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);
        FHE.allowThis(totalSupplyEncrypted);

        emit Mint(to, amount);
    }

    /// @notice Transfer encrypted amount to recipient
    /// @dev Uses fail-closed design: if insufficient balance, transfers 0
    function transfer(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyAllowed(msg.sender) onlyAllowed(to) returns (bool) {
        // Verify and convert encrypted input
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Check if sender has sufficient balance (encrypted comparison)
        ebool hasSufficientBalance = FHE.le(amount, _balances[msg.sender]);

        // Select actual transfer amount: amount if sufficient, 0 otherwise
        euint64 transferAmount = FHE.select(
            hasSufficientBalance,
            amount,
            FHE.asEuint64(0)
        );

        // Update balances
        _balances[msg.sender] = FHE.sub(_balances[msg.sender], transferAmount);
        _balances[to] = FHE.add(_balances[to], transferAmount);

        // Update permissions
        FHE.allowThis(_balances[msg.sender]);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allow(_balances[to], to);

        emit Transfer(msg.sender, to);
        return true;
    }

    /// @notice Get total supply (encrypted)
    function totalSupply() external view returns (euint64) {
        return totalSupplyEncrypted;
    }

    /// @notice Burn tokens from a user (owner only)
    function burn(address from, uint64 amount) external onlyOwner onlyAllowed(from) {
        euint64 burnAmount = FHE.asEuint64(amount);

        // Check if user has sufficient balance
        ebool hasSufficientBalance = FHE.le(burnAmount, _balances[from]);

        // Select actual burn amount: amount if sufficient, 0 otherwise
        euint64 actualBurnAmount = FHE.select(
            hasSufficientBalance,
            burnAmount,
            FHE.asEuint64(0)
        );

        // Update balances
        _balances[from] = FHE.sub(_balances[from], actualBurnAmount);
        totalSupplyEncrypted = FHE.sub(totalSupplyEncrypted, actualBurnAmount);

        // Update permissions
        FHE.allowThis(_balances[from]);
        FHE.allow(_balances[from], from);
        FHE.allowThis(totalSupplyEncrypted);

        emit Burn(from, amount);
    }

    /// @notice Batch add users to allowlist
    function batchSetAllowed(address[] calldata users, bool allowed) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            isAllowed[users[i]] = allowed;
            emit AllowlistUpdated(users[i], allowed);
        }
    }

    /// @notice Transfer ownership to a new owner
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        address oldOwner = owner;
        owner = newOwner;
        isAllowed[newOwner] = true;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /// @notice Check if balance is initialized for a user
    function hasBalance(address user) external view returns (bool) {
        return isAllowed[user];
    }

    /// @notice Public faucet - anyone can claim tokens
    function claimFaucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + faucetCooldown,
            "Faucet cooldown not elapsed"
        );

        // Auto-add to allowlist if claiming from faucet
        if (!isAllowed[msg.sender]) {
            isAllowed[msg.sender] = true;
            emit AllowlistUpdated(msg.sender, true);
        }

        // Mint faucet amount
        euint64 mintAmount = FHE.asEuint64(faucetAmount);
        _balances[msg.sender] = FHE.add(_balances[msg.sender], mintAmount);
        totalSupplyEncrypted = FHE.add(totalSupplyEncrypted, mintAmount);

        // Set permissions
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allowThis(totalSupplyEncrypted);

        // Update last claim time
        lastFaucetClaim[msg.sender] = block.timestamp;

        emit FaucetClaimed(msg.sender, faucetAmount);
        emit Mint(msg.sender, faucetAmount);
    }

    /// @notice Update faucet settings (owner only)
    function setFaucetSettings(uint64 newAmount, uint256 newCooldown) external onlyOwner {
        faucetAmount = newAmount;
        faucetCooldown = newCooldown;
    }

    /// @notice Get time until user can claim from faucet again
    function timeUntilNextClaim(address user) external view returns (uint256) {
        uint256 nextClaimTime = lastFaucetClaim[user] + faucetCooldown;
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        return nextClaimTime - block.timestamp;
    }
}
