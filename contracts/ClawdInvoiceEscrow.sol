// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * ClawdInvoice Escrow Contract 🦞💰
 * 
 * Escrows USDC between agents with verification-based release.
 */

contract ClawdInvoiceEscrow is ReentrancyGuard, Ownable(msg.sender) {
    IERC20 public usdcToken;
    uint256 private _invoiceIdCounter;
    
    mapping(uint256 => Invoice) public invoices;
    mapping(address => bool) public verifiedAgents;
    
    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed from,
        address indexed to,
        uint256 amount,
        string description,
        uint256 deadline
    );
    event InvoiceVerified(uint256 indexed invoiceId);
    event InvoiceReleased(uint256 indexed invoiceId, uint256 amount);
    event InvoiceRefunded(uint256 indexed invoiceId, uint256 amount);
    event AgentVerified(address indexed agent);
    
    struct Invoice {
        address from;
        address to;
        uint256 amount;
        string description;
        bool isEscrow;
        bool workVerified;
        bool paid;
        uint256 createdAt;
        uint256 deadline;
        string metadata;
    }
    
    constructor(address _usdcToken) {
        usdcToken = IERC20(_usdcToken);
    }
    
    function createInvoice(
        address _to,
        uint256 _amount,
        string calldata _description,
        uint256 _deadlineHours,
        bool _escrow
    ) external nonReentrant returns (uint256) {
        require(_to != address(0), "Invalid recipient");
        require(_to != msg.sender, "Cannot invoice self");
        require(_amount > 0, "Amount must be > 0");
        require(_deadlineHours > 0 && _deadlineHours <= 720, "Invalid deadline");
        
        uint256 invoiceId = _invoiceIdCounter;
        _invoiceIdCounter++;
        
        if (_escrow) {
            require(usdcToken.transferFrom(msg.sender, address(this), _amount), "USDC transfer failed");
        }
        
        invoices[invoiceId] = Invoice({
            from: msg.sender,
            to: _to,
            amount: _amount,
            description: _description,
            isEscrow: _escrow,
            workVerified: false,
            paid: false,
            createdAt: block.timestamp,
            deadline: block.timestamp + (_deadlineHours * 1 hours),
            metadata: ""
        });
        
        emit InvoiceCreated(invoiceId, msg.sender, _to, _amount, _description, invoices[invoiceId].deadline);
        return invoiceId;
    }
    
    function verifyWork(uint256 _invoiceId) external {
        Invoice storage invoice = invoices[_invoiceId];
        require(invoice.paid == false, "Already paid");
        require(msg.sender == invoice.from || verifiedAgents[msg.sender], "Not authorized");
        invoice.workVerified = true;
        emit InvoiceVerified(_invoiceId);
    }
    
    function releasePayment(uint256 _invoiceId) external nonReentrant {
        Invoice storage invoice = invoices[_invoiceId];
        require(invoice.paid == false, "Already paid");
        require(invoice.workVerified, "Work not verified");
        invoice.paid = true;
        if (invoice.isEscrow) {
            require(usdcToken.transfer(invoice.to, invoice.amount), "USDC transfer failed");
        }
        emit InvoiceReleased(_invoiceId, invoice.amount);
    }
    
    function refundInvoice(uint256 _invoiceId) external nonReentrant {
        Invoice storage invoice = invoices[_invoiceId];
        require(invoice.paid == false, "Already paid");
        bool deadlinePassed = block.timestamp > invoice.deadline;
        bool isCreator = msg.sender == invoice.from;
        bool isRecipient = msg.sender == invoice.to;
        require(deadlinePassed || isCreator || isRecipient, "Cannot refund yet");
        invoice.paid = true;
        if (invoice.isEscrow) {
            require(usdcToken.transfer(invoice.from, invoice.amount), "USDC refund failed");
        }
        emit InvoiceRefunded(_invoiceId, invoice.amount);
    }
    
    function addVerifiedAgent(address _agent) external onlyOwner {
        verifiedAgents[_agent] = true;
        emit AgentVerified(_agent);
    }
    
    function getInvoice(uint256 _invoiceId) external view returns (Invoice memory) {
        return invoices[_invoiceId];
    }
    
    function getInvoiceCount() external view returns (uint256) {
        return _invoiceIdCounter;
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdcToken.balanceOf(address(this));
        if (balance > 0) {
            usdcToken.transfer(owner(), balance);
        }
    }
}
